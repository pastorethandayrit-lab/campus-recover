import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// 1. CONFIGURATION
const supabaseUrl = "https://wdwvnojjjiodrtyrutgz.supabase.co";
const supabaseKey = "sb_publishable_o5Ah6hay4s3LIFV0dRrQtA_gmQoMDlI";
const supabase = createClient(supabaseUrl, supabaseKey);

const cloudName = "daxarj70f"; 
const uploadPreset = "unsigned_upload"; 

// 2. IMAGE UPLOAD
async function uploadImage(file) {
  if (!file) return "https://via.placeholder.com/200";
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: formData });
  if (!res.ok) throw new Error("Image upload failed.");
  const data = await res.json();
  return data.secure_url;
}

// 3. AUTHENTICATION
async function handleAuth(e, type) {
  e.preventDefault();
  const email = e.target.querySelector("input[type=email]").value;
  const password = e.target.querySelector("input[type=password]").value;
  
  const { data, error } = type === 'login' 
    ? await supabase.auth.signInWithPassword({ email, password })
    : await supabase.auth.signUp({ email, password });

  if (error) {
    alert(error.message);
  } else {
    // Force session to save
    await supabase.auth.setSession(data.session);
    window.location.href = "index.html";
  }
}

// 4. HOME PAGE RENDERING
function renderItems(items) {
  const container = document.getElementById("itemsContainer");
  if (!container) return;
  if (items.length === 0) {
    container.innerHTML = `<p style="grid-column: 1/-1; text-align: center;">No items found.</p>`;
    return;
  }
  container.innerHTML = items.map(item => `
    <div class="card">
      <img src="${item.image_url}" style="width:100%; height:200px; object-fit:cover;">
      <div style="padding: 1.5rem;">
        <span class="badge ${item.type}">${item.type}</span>
        <h3 style="margin: 0.5rem 0;">${item.title}</h3>
        <p style="color: #666; font-size: 0.9rem; margin-bottom: 1rem;">📍 ${item.location}</p>
        <button onclick="window.claimItem('${item.id}')" class="btn-claim">
          ${item.type === 'found' ? 'Claim This Item' : 'I Found This!'}
        </button>
      </div>
    </div>
  `).join("");
}

// 5. INITIALIZE LOGIC
document.addEventListener("DOMContentLoaded", async () => {
  const { data: { session } } = await supabase.auth.getSession();

  // Load Home Data
  if (document.getElementById("itemsContainer")) {
    const { data } = await supabase.from("items").select("*").eq("status", "approved").order("created_at", { ascending: false });
    if (data) renderItems(data);
  }

  // Auth Forms
  if (document.getElementById("loginForm")) document.getElementById("loginForm").addEventListener("submit", (e) => handleAuth(e, 'login'));
  if (document.getElementById("registerForm")) document.getElementById("registerForm").addEventListener("submit", (e) => handleAuth(e, 'register'));

  // Logout Logic
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "login.html";
  });

  // Report Logic
  const upForm = document.getElementById("uploadForm");
  if (upForm) {
    upForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!session) return alert("Please sign in first!");
      
      const btn = e.target.querySelector('button[type="submit"]');
      btn.innerText = "Processing..."; btn.disabled = true;

      try {
        const fileInput = e.target.querySelector('input[type="file"]');
        const imageUrl = await uploadImage(fileInput.files[0]);
        
        await supabase.from("items").insert([{ 
          type: e.target.querySelector('select').value, 
          title: e.target.querySelectorAll('input')[0].value, 
          category: e.target.querySelectorAll('select')[1].value, 
          description: e.target.querySelector('textarea').value, 
          location: e.target.querySelectorAll('input')[1].value, 
          date: e.target.querySelectorAll('input')[2].value,
          status: 'pending', 
          image_url: imageUrl, 
          user_id: session.user.id 
        }]);

        alert("Success! Waiting for admin approval.");
        window.location.href = "index.html";
      } catch (err) { alert(err.message); btn.innerText = "Submit Report"; btn.disabled = false; }
    });
  }

  // Admin Protection
  if (window.location.pathname.includes("admin.html")) {
    if (!session || session.user.email !== 'admin@campus.com') {
      document.getElementById("adminSection").style.display = "none";
      document.getElementById("accessDenied").style.display = "block";
    } else {
      document.getElementById("adminSection").style.display = "block";
      loadAdminDashboard();
    }
  }
});

// Admin Dashboard
async function loadAdminDashboard() {
  const { data: items } = await supabase.from("items").select("*").order("created_at", { ascending: false });
  const tableBody = document.getElementById("adminTableBody");
  if (!tableBody || !items) return;

  tableBody.innerHTML = items.map(item => `
    <tr>
      <td>${item.title}</td>
      <td><span class="status-tag ${item.status}">${item.status}</span></td>
      <td>${item.type}</td>
      <td>${new Date(item.created_at).toLocaleDateString()}</td>
      <td>
        ${item.status === 'pending' ? `<button onclick="window.updateStatus('${item.id}', 'approved')" class="btn-approve" style="padding:5px 10px; width:auto;">Approve</button>` : ''}
        <button onclick="window.deleteItem('${item.id}')" class="btn-delete" style="padding:5px 10px; width:auto;">Delete</button>
      </td>
    </tr>
  `).join("");
}

// Window Globals
window.updateStatus = async (id, status) => {
  await supabase.from("items").update({ status }).eq("id", id);
  location.reload();
};
window.deleteItem = async (id) => {
  if (confirm("Delete?")) {
    await supabase.from("items").delete().eq("id", id);
    location.reload();
  }
};
window.claimItem = async (itemId) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return window.location.href = "login.html";
  await supabase.from("claims").insert([{ item_id: itemId, claimer_id: session.user.id, claimer_email: session.user.email, status: 'pending' }]);
  alert("Claim sent!");
};