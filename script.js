import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// 1. CONFIGURATION
const supabaseUrl = "https://wdwvnojjjiodrtyrutgz.supabase.co";
const supabaseKey = "sb_publishable_o5Ah6hay4s3LIFV0dRrQtA_gmQoMDlI";
const supabase = createClient(supabaseUrl, supabaseKey);

const cloudName = "daxarj70f"; 
const uploadPreset = "unsigned_upload"; 

// --- THE CRITICAL SETTING ---
// Ensure this is EXACTLY what is in your Supabase Auth table
const ADMIN_EMAIL = 'admin@campus.com'; 

// 2. THE GATEKEEPER
document.addEventListener("DOMContentLoaded", async () => {
  const { data: { session } } = await supabase.auth.getSession();
  const path = window.location.pathname;
  const isAuthPage = path.includes("login.html") || path.includes("register.html");

  // If not logged in and not on login/reg, go to login
  if (!session && !isAuthPage) {
    window.location.href = "login.html";
    return;
  }

  // --- ADMIN LOGIC DEBUGGER ---
  const userEmail = session?.user?.email || "";
  const isAdmin = userEmail.toLowerCase().trim() === ADMIN_EMAIL.toLowerCase().trim();

  console.log("--- Auth Debugger ---");
  console.log("Logged in as:", userEmail);
  console.log("Target Admin Email:", ADMIN_EMAIL);
  console.log("Is Admin Match?:", isAdmin);

  // If logged in but on auth page, go home
  if (session && isAuthPage) {
    window.location.href = "index.html";
    return;
  }

  // Protect Admin Page: If on admin.html and NOT admin, kick to index
  if (path.includes("admin.html") && !isAdmin) {
    console.error("Access Denied: Redirecting to Home");
    window.location.href = "index.html";
    return;
  }

  renderNavbar(session, isAdmin);
  setupPageLogic(session, isAdmin);
});

// 3. DYNAMIC NAVIGATION
function renderNavbar(session, isAdmin) {
  const navUl = document.querySelector('.navbar ul');
  if (!navUl) return;

  if (!session) {
    navUl.innerHTML = `
      <li><a href="login.html">Sign In</a></li>
      <li><a href="register.html">Register</a></li>
    `;
  } else {
    let navHTML = `
      <li><a href="index.html">Home</a></li>
      <li><a href="upload.html">Report</a></li>
      <li><a href="profile.html">Profile</a></li>
    `;
    
    // Only add admin link if logic passed
    if (isAdmin) {
      navHTML += `<li><a href="admin.html">Admin</a></li>`;
    }
    
    navUl.innerHTML = navHTML;
  }

  // Highlight active link
  const currentPath = window.location.pathname;
  document.querySelectorAll('.navbar a').forEach(link => {
    if (currentPath.includes(link.getAttribute('href'))) {
      link.classList.add('active');
    }
  });
}

// 4. AUTHENTICATION
async function handleAuth(e, type) {
  e.preventDefault();
  const email = e.target.querySelector("input[type=email]").value;
  const password = e.target.querySelector("input[type=password]").value;
  const btn = e.target.querySelector('button');
  
  btn.innerText = "Processing...";
  btn.disabled = true;

  try {
    const { data, error } = type === 'login' 
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

// 5. PAGE LOGIC
async function setupPageLogic(session, isAdmin) {
  const loginForm = document.getElementById("loginForm");
  if (loginForm) loginForm.addEventListener("submit", (e) => handleAuth(e, 'login'));
  
  const regForm = document.getElementById("registerForm");
  if (regForm) regForm.addEventListener("submit", (e) => handleAuth(e, 'register'));

  if (!session) return;

  // Profile Logic
  if (document.getElementById("userEmail")) {
    document.getElementById("userEmail").innerText = session.user.email;
    const roleTag = document.getElementById("userRole");
    
    if (isAdmin) {
      roleTag.innerText = "Admin";
      roleTag.style.background = "#ef4444"; 
      roleTag.style.color = "white";
    } else {
      roleTag.innerText = "User";
    }
  }

  // Logout
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await supabase.auth.signOut();
      window.location.href = "login.html";
    });
  }

  // Admin Dashboard
  if (window.location.pathname.includes("admin.html") && isAdmin) {
    const section = document.getElementById("adminSection");
    if (section) section.style.display = "block";
    loadAdminDashboard();
  }

  // Load Items for Home
  if (document.getElementById("itemsContainer")) {
    const { data } = await supabase.from("items").select("*").eq("status", "approved");
    renderItems(data || []);
  }

  // Report/Upload Form
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

// 6. HELPERS & GLOBALS
async function uploadImage(file) {
  if (!file) return "https://via.placeholder.com/200";
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: formData });
  const data = await res.json();
  return data.secure_url;
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

window.updateStatus = async (id, status) => { await supabase.from("items").update({ status }).eq("id", id); location.reload(); };
window.deleteItem = async (id) => { if(confirm("Delete?")) { await supabase.from("items").delete().eq("id", id); location.reload(); } };
window.claimItem = () => alert("Claim request sent!");