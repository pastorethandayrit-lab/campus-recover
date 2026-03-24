import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// 1. CONFIGURATION
const supabaseUrl = "https://wdwvnojjjiodrtyrutgz.supabase.co";
const supabaseKey = "sb_publishable_o5Ah6hay4s3LIFV0dRrQtA_gmQoMDlI";
const supabase = createClient(supabaseUrl, supabaseKey);

const cloudName = "daxarj70f"; 
const uploadPreset = "unsigned_upload"; 

// 2. THE ADMIN EMAIL 
// CRITICAL: Ensure this is exactly what you use to sign in.
const ADMIN_EMAIL = 'admin@campus.com'; 

// 3. THE GATEKEEPER
document.addEventListener("DOMContentLoaded", async () => {
  const { data: { session } } = await supabase.auth.getSession();
  const path = window.location.pathname;
  const isAuthPage = path.includes("login.html") || path.includes("register.html");

  // Authentication Guard
  if (!session && !isAuthPage) {
    window.location.href = "login.html";
    return;
  }

  // --- THE STRIKE-ZONE FIX ---
  const userEmail = session?.user?.email || "";
  // This converts BOTH to lowercase and removes spaces to force a match
  const isAdmin = userEmail.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim();

  // DEBUGGER (Press F12 to see this in your browser)
  console.log("--- ADMIN DEBUG ---");
  console.log("Logged in as:", `[${userEmail}]`);
  console.log("Target Admin:", `[${ADMIN_EMAIL}]`);
  console.log("Result:", isAdmin ? "✅ MATCH FOUND" : "❌ NO MATCH");

  if (session && isAuthPage) {
    window.location.href = "index.html";
    return;
  }

  // Admin Page Protection
  if (path.includes("admin.html") && !isAdmin) {
    console.warn("Access Denied: Not an admin account.");
    window.location.href = "index.html";
    return;
  }

  setupPage(session, isAdmin);
});

// 4. PAGE INITIALIZATION
async function setupPage(session, isAdmin) {
  // Forms
  const loginForm = document.getElementById("loginForm");
  if (loginForm) loginForm.addEventListener("submit", (e) => handleAuth(e, 'login'));
  
  const regForm = document.getElementById("registerForm");
  if (regForm) regForm.addEventListener("submit", (e) => handleAuth(e, 'register'));

  if (!session) return;

  // Profile Page UI
  const emailDisplay = document.getElementById("userEmail");
  if (emailDisplay) {
    emailDisplay.innerText = session.user.email;
    const roleTag = document.getElementById("userRole");
    const avatar = document.getElementById("avatarText");
    
    if (avatar) avatar.innerText = session.user.email[0].toUpperCase();
    
    if (roleTag) {
      roleTag.innerText = isAdmin ? "Admin" : "User";
      roleTag.style.background = isAdmin ? "#ef4444" : "#dcfce7";
      roleTag.style.color = isAdmin ? "white" : "#166534";
    }
  }

  // Navbar Logic
  const adminNavLink = document.querySelector('a[href="admin.html"]');
  if (adminNavLink) {
    // Only show the link in the menu if isAdmin is true
    adminNavLink.parentElement.style.display = isAdmin ? "block" : "none";
  }

  // Admin Dashboard Loading
  if (window.location.pathname.includes("admin.html") && isAdmin) {
    const section = document.getElementById("adminSection");
    if (section) section.style.display = "block";
    loadAdminDashboard();
  }

  // Home Page Items
  if (document.getElementById("itemsContainer")) {
    const { data } = await supabase.from("items").select("*").eq("status", "approved");
    renderItems(data || []);
  }

  // Logout Logic
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await supabase.auth.signOut();
      window.location.href = "login.html";
    });
  }

  // Upload Logic
  const upForm = document.getElementById("uploadForm");
  if (upForm) {
    upForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = upForm.querySelector('button');
      btn.innerText = "Uploading..."; btn.disabled = true;

      try {
        const file = upForm.querySelector('input[type="file"]').files[0];
        const imageUrl = await uploadImage(file);
        const { error } = await supabase.from("items").insert([{ 
          title: upForm.querySelectorAll('input')[0].value,
          type: upForm.querySelector('select').value,
          category: upForm.querySelectorAll('select')[1].value,
          description: upForm.querySelector('textarea').value,
          location: upForm.querySelectorAll('input')[1].value,
          date: upForm.querySelectorAll('input')[2].value,
          image_url: imageUrl,
          user_id: session.user.id,
          status: 'pending'
        }]);
        if (error) throw error;
        alert("Reported! Waiting for admin approval.");
        window.location.href = "index.html";
      } catch (err) { alert(err.message); btn.innerText = "Submit"; btn.disabled = false; }
    });
  }
}

// 5. AUTHENTICATION
async function handleAuth(e, type) {
  e.preventDefault();
  const email = e.target.querySelector("input[type=email]").value;
  const password = e.target.querySelector("input[type=password]").value;
  const btn = e.target.querySelector('button');
  
  btn.innerText = "Processing...";
  btn.disabled = true;

  try {
    const { error } = type === 'login' 
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    if (error) throw error;
    window.location.href = "index.html";
  } catch (err) {
    alert(err.message);
    btn.innerText = type === 'login' ? "Login" : "Register";
    btn.disabled = false;
  }
}

// 6. DASHBOARD & RENDERERS
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
        ${item.status === 'pending' ? `<button onclick="window.updateStatus('${item.id}', 'approved')" class="btn-approve">Approve</button>` : ''}
        <button onclick="window.deleteItem('${item.id}')" class="btn-delete">Delete</button>
      </td>
    </tr>
  `).join("");
}

function renderItems(items) {
  const container = document.getElementById("itemsContainer");
  if (!container) return;
  container.innerHTML = items.length ? items.map(item => `
    <div class="card">
      <img src="${item.image_url}" style="width:100%; height:200px; object-fit:cover;">
      <div style="padding: 1.5rem;">
        <span class="badge ${item.type}">${item.type}</span>
        <h3>${item.title}</h3>
        <p>📍 ${item.location}</p>
        <button onclick="window.claimItem('${item.id}')" class="btn-approve" style="width:100%; margin-top:10px;">Claim</button>
      </div>
    </div>
  `).join("") : `<p>No items found.</p>`;
}

async function uploadImage(file) {
  if (!file) return "https://via.placeholder.com/200";
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: formData });
  const data = await res.json();
  return data.secure_url;
}

// 7. WINDOW GLOBALS
window.updateStatus = async (id, status) => { 
  await supabase.from("items").update({ status }).eq("id", id); 
  location.reload(); 
};

window.deleteItem = async (id) => { 
  if(confirm("Delete?")) { 
    await supabase.from("items").delete().eq("id", id); 
    location.reload(); 
  } 
};

window.claimItem = () => alert("Claim request sent!");