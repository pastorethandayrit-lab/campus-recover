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
  
  const tableBody = document.getElementById("adminTableBody");
  if (tableBody && items) {
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
  }

  const claimsList = document.getElementById("claimsList");
  if (claimsList && claims) {
    if (claims.length === 0) {
        claimsList.innerHTML = "<p>No active claim requests.</p>";
    } else {
        claimsList.innerHTML = claims.map(c => `
          <div style="padding: 15px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; background: white; margin-bottom: 5px; border-radius: 8px;">
            <div>
              <strong style="color: #222;">${c.claimer_email}</strong> 
              wants to claim <strong>${c.items?.title || 'Item'}</strong>
              <br><span class="status-tag ${c.status || 'pending'}">${c.status || 'pending'}</span>
            </div>
            <div style="display: flex; gap: 5px;">
              <button onclick="window.updateClaimStatus('${c.id}', 'approved')" class="btn-approve">Allow</button>
              <button onclick="window.updateClaimStatus('${c.id}', 'rejected')" class="btn-reject" style="background: #f59e0b;">Reject</button>
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
  // --- GATEKEEPER START ---
  const { data: { session } } = await supabase.auth.getSession();
  
  // These pages are accessible to everyone
  const publicPages = ["login.html", "register.html", "index.html", ""]; 
  const currentPage = window.location.pathname.split("/").pop();

  // Redirect to login if accessing protected page while logged out
  if (!session && !publicPages.includes(currentPage)) {
    alert("Please sign in to access this page.");
    window.location.href = "login.html";
    return;
  }
  // --- GATEKEEPER END ---

  // Load public content (Recent Items)
  const { data: recent } = await supabase.from("items")
    .select("*")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(6);
  if (recent) renderItems(recent);

  // If logged in, handle profile and admin access
  if (session) {
    if (document.getElementById("userEmail")) document.getElementById("userEmail").textContent = session.user.email;
    if (document.getElementById("avatarText")) document.getElementById("avatarText").textContent = session.user.email[0].toUpperCase();

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", session.user.id).single();
    
    if (document.getElementById("userRole")) {
        document.getElementById("userRole").textContent = profile?.role || "User";
    }

    // Role-based gatekeeping for Admin page
    if (currentPage === "admin.html" && profile?.role !== "admin") {
        alert("Admin access only.");
        window.location.href = "index.html";
        return;
    }

    if (document.getElementById("adminSection") && profile?.role === "admin") {
      document.getElementById("adminSection").style.display = "block";
      loadAdminDashboard();
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