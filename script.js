import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// 1. CONFIGURATION
const supabaseUrl = "https://wdwvnojjjiodrtyrutgz.supabase.co";
const supabaseKey = "sb_publishable_o5Ah6hay4s3LIFV0dRrQtA_gmQoMDlI";
const supabase = createClient(supabaseUrl, supabaseKey);

const cloudName = "daxarj70f"; 
const uploadPreset = "unsigned_upload"; 

// 2. IMAGE UPLOAD
async function uploadImage(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData
  });
  if (!res.ok) throw new Error("Image upload failed.");
  const data = await res.json();
  return data.secure_url;
}

// 3. AUTHENTICATION
async function handleAuth(e, type) {
  e.preventDefault();
  const email = e.target.querySelector("input[type=email]").value;
  const password = e.target.querySelector("input[type=password]").value;
  
  const { error } = type === 'login' 
    ? await supabase.auth.signInWithPassword({ email, password })
    : await supabase.auth.signUp({ email, password });

  if (error) alert(error.message);
  else window.location.href = "index.html";
}

// 4. CLAIM INTERACTION
window.claimItem = async (itemId, type) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { 
    alert("Please sign in first!"); 
    window.location.href = "login.html"; 
    return; 
  }

  const { error } = await supabase.from("claims").insert([{
    item_id: itemId,
    claimer_id: session.user.id,
    claimer_email: session.user.email,
    status: 'pending'
  }]);

  if (error) alert("Error: " + error.message);
  else alert("Success! Your request has been sent to the dashboard.");
};

// 5. ADMIN DASHBOARD ACTIONS
async function loadAdminDashboard() {
  const { data: items } = await supabase.from("items").select("*").order("created_at", { ascending: false });
  const { data: claims } = await supabase.from("claims").select("*, items(title)").order("created_at", { ascending: false });

  if(document.getElementById("totalItems")) document.getElementById("totalItems").textContent = items?.length || 0;
  if(document.getElementById("activeLost")) document.getElementById("activeLost").textContent = items?.filter(i => i.type === 'lost').length || 0;
  if(document.getElementById("activeFound")) document.getElementById("activeFound").textContent = items?.filter(i => i.type === 'found').length || 0;
  
  // RENDER REPORTS (Desktop & Mobile)
  const tableBody = document.getElementById("adminTableBody");
  const mobileCards = document.getElementById("adminCardsMobile");

  if (items) {
    // Desktop Table
    tableBody.innerHTML = items.map(item => `
      <tr>
        <td>${item.title}</td>
        <td><span class="status-tag ${item.status}">${item.status}</span></td>
        <td>${item.type}</td>
        <td>
          <button onclick="window.updateStatus('${item.id}', 'approved')" class="btn-approve">Approve</button>
          <button onclick="window.deleteItem('${item.id}')" class="btn-delete">Delete</button>
        </td>
      </tr>`).join("");

    // Mobile Cards
    mobileCards.innerHTML = items.map(item => `
      <div class="mobile-admin-card">
        <h4>${item.title} <span class="status-tag ${item.status}">${item.status}</span></h4>
        <p style="font-size: 0.85rem; color: #666;">Type: ${item.type}</p>
        <div class="admin-actions">
          <button onclick="window.updateStatus('${item.id}', 'approved')" class="btn-approve">Approve</button>
          <button onclick="window.deleteItem('${item.id}')" class="btn-delete">Delete</button>
        </div>
      </div>`).join("");
  }

  // RENDER CLAIMS
  const claimsList = document.getElementById("claimsList");
  if (claimsList && claims) {
    if (claims.length === 0) {
        claimsList.innerHTML = "<p class='empty-msg'>No active claim requests.</p>";
    } else {
        claimsList.innerHTML = claims.map(c => `
          <div class="claim-item-card">
            <div>
              <strong style="color: #222;">${c.claimer_email}</strong> 
              wants to claim <strong>${c.items?.title || 'Item'}</strong>
              <br><span class="status-tag ${c.status || 'pending'}">${c.status || 'pending'}</span>
            </div>
            <div class="claim-actions">
              <button onclick="window.updateClaimStatus('${c.id}', 'approved')" class="btn-approve">Allow</button>
              <button onclick="window.updateClaimStatus('${c.id}', 'rejected')" class="btn-reject">Reject</button>
              <button onclick="window.deleteClaim('${c.id}')" class="btn-delete">Delete</button>
            </div>
          </div>
        `).join("");
    }
  }
}

window.updateStatus = async (id, status) => {
  await supabase.from("items").update({ status }).eq("id", id);
  loadAdminDashboard();
};

window.deleteItem = async (id) => {
  if (confirm("Delete this report permanently?")) {
    await supabase.from("items").delete().eq("id", id);
    loadAdminDashboard();
  }
};

window.updateClaimStatus = async (id, status) => {
  const { error } = await supabase.from("claims").update({ status }).eq("id", id);
  if (error) alert(error.message);
  else {
    alert(`Claim ${status}!`);
    loadAdminDashboard();
  }
};

window.deleteClaim = async (id) => {
  if (confirm("Delete this claim request?")) {
    await supabase.from("claims").delete().eq("id", id);
    loadAdminDashboard();
  }
};

// 6. UI RENDERING
function renderItems(items) {
  const container = document.getElementById("itemsContainer");
  if (!container) return;
  container.innerHTML = items.map(item => `
    <div class="card">
      <img src="${item.image_url}" style="width:100%; height:200px; object-fit:cover; border-radius:8px;">
      <div style="padding:15px;">
        <span class="badge ${item.type}">${item.type}</span>
        <h3 style="margin:10px 0;">${item.title}</h3>
        <p>📍 ${item.location}</p>
        <button onclick="window.claimItem('${item.id}', '${item.type}')" class="btn-claim">
          ${item.type === 'found' ? 'Claim This Item' : 'I Found This!'}
        </button>
      </div>
    </div>
  `).join("");
}

// 7. INITIALIZE & GATEKEEPER
document.addEventListener("DOMContentLoaded", async () => {
  const { data: { session } } = await supabase.auth.getSession();
  const publicPages = ["login.html", "register.html"]; 
  const currentPage = window.location.pathname.split("/").pop();

  if (!session && !publicPages.includes(currentPage)) {
    window.location.href = "login.html";
    return;
  }

  const { data: recent } = await supabase.from("items")
    .select("*")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(6);
  if (recent) renderItems(recent);

  if (session) {
    if (document.getElementById("userEmail")) document.getElementById("userEmail").textContent = session.user.email;
    if (document.getElementById("avatarText")) document.getElementById("avatarText").textContent = session.user.email[0].toUpperCase();

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", session.user.id).single();
    if (document.getElementById("userRole")) document.getElementById("userRole").textContent = profile?.role || "User";

    if (currentPage === "admin.html") {
        if (profile?.role === "admin") {
            document.getElementById("adminSection").style.display = "block";
            document.getElementById("accessDenied").style.display = "none";
            loadAdminDashboard();
        } else {
            document.getElementById("adminSection").style.display = "none";
            document.getElementById("accessDenied").style.display = "block";
        }
    }
  }

  // Form Listeners
  if (document.getElementById("loginForm")) document.getElementById("loginForm").addEventListener("submit", (e) => handleAuth(e, 'login'));
  if (document.getElementById("registerForm")) document.getElementById("registerForm").addEventListener("submit", (e) => handleAuth(e, 'register'));
  
  const upForm = document.getElementById("uploadForm");
  if (upForm) {
    upForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      try {
        const fields = e.target.querySelectorAll("input, select, textarea");
        const { data: { user } } = await supabase.auth.getUser();
        const imageUrl = await uploadImage(fields[6].files[0]);
        await supabase.from("items").insert([{ 
          type: fields[0].value, title: fields[1].value, category: fields[2].value, 
          description: fields[3].value, location: fields[4].value, date: fields[5].value,
          status: 'pending', image_url: imageUrl, user_id: user.id 
        }]);
        alert("Report submitted! Waiting for approval.");
        window.location.href = "index.html";
      } catch (err) { alert(err.message); }
    });
  }

  document.querySelectorAll("#logoutBtn").forEach(btn => 
    btn.addEventListener("click", () => supabase.auth.signOut().then(() => window.location.href = "login.html"))
  );
});