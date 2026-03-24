import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// 1. CONFIGURATION
const supabaseUrl = "https://wdwvnojjjiodrtyrutgz.supabase.co";
const supabaseKey = "sb_publishable_o5Ah6hay4s3LIFV0dRrQtA_gmQoMDlI";
const supabase = createClient(supabaseUrl, supabaseKey);

const cloudName = "daxarj70f"; 
const uploadPreset = "unsigned_upload"; 

// 2. THE GATEKEEPER (Database-Driven)
document.addEventListener("DOMContentLoaded", async () => {
  const { data: { session } } = await supabase.auth.getSession();
  const path = window.location.pathname;
  const isAuthPage = path.includes("login.html") || path.includes("register.html");

  // Redirect to login if not authenticated
  if (!session && !isAuthPage) {
    window.location.href = "login.html";
    return;
  }

  let isAdmin = false;

  if (session) {
    // We fetch the 'role' directly from your Supabase 'profiles' table
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    isAdmin = profile?.role === 'admin';
    
    // Debugging: Check your browser console (F12) to see your actual role
    console.log("Current User Role:", profile?.role || "No role found");
  }

  // Handle Navbar
  renderNavbar(session, isAdmin);

  // Redirect logged-in users away from Login/Register
  if (session && isAuthPage) {
    window.location.href = "index.html";
    return;
  }

  // Admin Page Protection
  if (path.includes("admin.html") && !isAdmin) {
    alert("Access Denied: Admin privileges required.");
    window.location.href = "index.html";
    return;
  }

  setupPage(session, isAdmin);
});

// 3. NAVBAR RENDERER
function renderNavbar(session, isAdmin) {
  const navList = document.querySelector(".navbar ul");
  if (!navList) return;

  if (!session) {
    navList.innerHTML = `
      <li><a href="login.html">Sign In</a></li>
      <li><a href="register.html">Register</a></li>
    `;
  } else {
    let links = `
      <li><a href="index.html">Home</a></li>
      <li><a href="upload.html">Report</a></li>
      <li><a href="profile.html">Profile</a></li>
    `;
    if (isAdmin) {
      links += `<li><a href="admin.html">Admin</a></li>`;
    }
    navList.innerHTML = links;
  }
}

// 4. PAGE INITIALIZATION
async function setupPage(session, isAdmin) {
  if (!session) {
    const loginForm = document.getElementById("loginForm");
    if (loginForm) loginForm.addEventListener("submit", (e) => handleAuth(e, 'login'));
    const regForm = document.getElementById("registerForm");
    if (regForm) regForm.addEventListener("submit", (e) => handleAuth(e, 'register'));
    return;
  }

  // Profile Logic
  const emailDisplay = document.getElementById("userEmail");
  if (emailDisplay) {
    emailDisplay.innerText = session.user.email;
    const roleTag = document.getElementById("userRole");
    if (roleTag) {
      roleTag.innerText = isAdmin ? "Admin" : "User";
      roleTag.style.background = isAdmin ? "#ef4444" : "#dcfce7";
      roleTag.style.color = isAdmin ? "white" : "#166534";
    }
  }

  // Admin Dashboard
  if (window.location.pathname.includes("admin.html") && isAdmin) {
    const section = document.getElementById("adminSection");
    if (section) section.style.display = "block";
    loadAdminDashboard();
  }

  // Home Page
  if (document.getElementById("itemsContainer")) {
    const { data } = await supabase.from("items").select("*").eq("status", "approved");
    renderItems(data || []);
  }

  // Logout
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await supabase.auth.signOut();
      window.location.href = "login.html";
    });
  }
}

// 5. AUTHENTICATION & HELPERS
async function handleAuth(e, type) {
  e.preventDefault();
  const email = e.target.querySelector("input[type=email]").value;
  const password = e.target.querySelector("input[type=password]").value;
  try {
    const { error } = type === 'login' 
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    if (error) throw error;
    window.location.href = "index.html";
  } catch (err) { alert(err.message); }
}

async function loadAdminDashboard() {
  const { data: items } = await supabase.from("items").select("*").order("created_at", { ascending: false });
  const tableBody = document.getElementById("adminTableBody");
  if (tableBody && items) {
    tableBody.innerHTML = items.map(item => `
      <tr>
        <td>${item.title}</td>
        <td><span class="status-tag ${item.status}">${item.status}</span></td>
        <td>${item.type}</td>
        <td>${new Date(item.created_at).toLocaleDateString()}</td>
        <td>
          ${item.status === 'pending' ? `<button onclick=\"window.updateStatus('${item.id}', 'approved')\" class=\"btn-approve\">Approve</button>` : ''}
          <button onclick=\"window.deleteItem('${item.id}')\" class=\"btn-delete\">Delete</button>
        </td>
      </tr>
    `).join("");
  }
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

window.updateStatus = async (id, status) => { await supabase.from("items").update({ status }).eq("id", id); location.reload(); };
window.deleteItem = async (id) => { if(confirm("Delete?")) { await supabase.from("items").delete().eq("id", id); location.reload(); } };