import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// 1. CONFIGURATION
const supabaseUrl = "https://wdwvnojjjiodrtyrutgz.supabase.co";
const supabaseKey = "sb_publishable_o5Ah6hay4s3LIFV0dRrQtA_gmQoMDlI";
const supabase = createClient(supabaseUrl, supabaseKey);

const cloudName = "daxarj70f"; 
const uploadPreset = "unsigned_upload"; 

// 2. THE GATEKEEPER (Strict Access Control)
document.addEventListener("DOMContentLoaded", async () => {
  const { data: { session } } = await supabase.auth.getSession();
  
  const path = window.location.pathname;
  const isAuthPage = path.includes("login.html") || path.includes("register.html");

  // Logic: If NOT logged in and NOT on an auth page, redirect to login
  if (!session && !isAuthPage) {
    window.location.href = "login.html";
    return; // Stop execution of other scripts
  }

  // Logic: If LOGGED IN and trying to access login/register, go to home
  if (session && isAuthPage) {
    window.location.href = "index.html";
    return;
  }

  // Initialize UI based on Auth State
  updateNavigation(session);
  setupPageLogic(session);
});

// 3. UI NAVIGATION CONTROL
function updateNavigation(session) {
  const navUl = document.querySelector('.navbar ul');
  if (!navUl) return;

  // If no session, the Gatekeeper redirect above handles page access, 
  // but we clean up the nav links just in case.
  if (!session) {
    navUl.innerHTML = `
      <li><a href="login.html">Sign In</a></li>
      <li><a href="register.html">Register</a></li>
    `;
  } else {
    // User is logged in - show functional pages
    let navHTML = `
      <li><a href="index.html">Home</a></li>
      <li><a href="upload.html">Report</a></li>
      <li><a href="profile.html">Profile</a></li>
    `;

    // Only show Admin link for the specific admin email
    if (session.user.email === 'admin@campus.com') {
      navHTML += `<li><a href="admin.html">Admin</a></li>`;
    }

    navUl.innerHTML = navHTML;
  }
}

// 4. AUTHENTICATION LOGIC
async function handleAuth(e, type) {
  e.preventDefault();
  const email = e.target.querySelector("input[type=email]").value;
  const password = e.target.querySelector("input[type=password]").value;
  const btn = e.target.querySelector('button');
  
  const originalText = btn.innerText;
  btn.innerText = "Processing...";
  btn.disabled = true;

  try {
    const { data, error } = type === 'login' 
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    if (error) throw error;

    if (data.user) {
      // Small delay to let local storage catch up before redirecting
      setTimeout(() => { window.location.href = "index.html"; }, 500);
    }
  } catch (err) {
    alert(err.message);
    btn.innerText = originalText;
    btn.disabled = false;
  }
}

// 5. PAGE-SPECIFIC LOGIC
async function setupPageLogic(session) {
  // Login Form
  const loginForm = document.getElementById("loginForm");
  if (loginForm) loginForm.addEventListener("submit", (e) => handleAuth(e, 'login'));

  // Register Form
  const regForm = document.getElementById("registerForm");
  if (regForm) regForm.addEventListener("submit", (e) => handleAuth(e, 'register'));

  // Logout Button (Profile Page)
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await supabase.auth.signOut();
      window.location.href = "login.html";
    });
  }

  // Home Page (Items Grid)
  if (document.getElementById("itemsContainer")) {
    const { data } = await supabase.from("items")
      .select("*")
      .eq("status", "approved")
      .order("created_at", { ascending: false });
    renderItems(data || []);
  }

  // Profile Page Details
  if (document.getElementById("userEmail") && session) {
    document.getElementById("userEmail").innerText = session.user.email;
    document.getElementById("avatarText").innerText = session.user.email[0].toUpperCase();
    if (session.user.email === 'admin@campus.com') {
      const roleTag = document.getElementById("userRole");
      if (roleTag) {
        roleTag.innerText = "Admin";
        roleTag.style.background = "#ef4444";
      }
    }
  }

  // Admin Dashboard
  if (window.location.pathname.includes("admin.html") && session?.user.email === 'admin@campus.com') {
    const adminSection = document.getElementById("adminSection");
    if (adminSection) adminSection.style.display = "block";
    loadAdminDashboard();
  }

  // Upload Form
  const upForm = document.getElementById("uploadForm");
  if (upForm && session) {
    upForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = upForm.querySelector('button[type="submit"]');
      btn.innerText = "Uploading..."; btn.disabled = true;

      try {
        const file = upForm.querySelector('input[type="file"]').files[0];
        const imageUrl = await uploadImage(file);
        
        const { error } = await supabase.from("items").insert([{ 
          type: upForm.querySelector('select').value, 
          title: upForm.querySelectorAll('input')[0].value, 
          category: upForm.querySelectorAll('select')[1].value, 
          description: upForm.querySelector('textarea').value, 
          location: upForm.querySelectorAll('input')[1].value, 
          date: upForm.querySelectorAll('input')[2].value,
          status: 'pending', 
          image_url: imageUrl, 
          user_id: session.user.id 
        }]);

        if (error) throw error;
        alert("Report submitted! Awaiting admin approval.");
        window.location.href = "index.html";
      } catch (err) { 
        alert(err.message); 
        btn.innerText = "Submit Report"; 
        btn.disabled = false; 
      }
    });
  }
}

// 6. HELPERS
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

function renderItems(items) {
  const container = document.getElementById("itemsContainer");
  if (!container) return;
  container.innerHTML = items.length ? items.map(item => `
    <div class="card">
      <img src="${item.image_url}" style="width:100%; height:200px; object-fit:cover;">
      <div style="padding: 1.5rem;">
        <span class="badge ${item.type}">${item.type.toUpperCase()}</span>
        <h3>${item.title}</h3>
        <p style="font-size: 0.9rem; color: #666; margin: 0.5rem 0;">📍 ${item.location}</p>
        <button onclick="window.claimItem('${item.id}')" class="btn-approve" style="width:100%; margin-top:10px;">Claim Item</button>
      </div>
    </div>
  `).join("") : `<p style="text-align:center; grid-column: 1/-1;">No approved items found.</p>`;
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
        ${item.status === 'pending' ? `<button onclick="window.updateStatus('${item.id}', 'approved')" class="btn-approve" style="padding:5px 10px; width:auto; font-size:12px;">Approve</button>` : ''}
        <button onclick="window.deleteItem('${item.id}')" class="btn-delete" style="padding:5px 10px; width:auto; font-size:12px;">Delete</button>
      </td>
    </tr>
  `).join("");
}

// 7. GLOBAL WINDOW FUNCTIONS (For HTML onclicks)
window.updateStatus = async (id, status) => {
  await supabase.from("items").update({ status }).eq("id", id);
  location.reload();
};

window.deleteItem = async (id) => {
  if (confirm("Are you sure you want to delete this report?")) {
    await supabase.from("items").delete().eq("id", id);
    location.reload();
  }
};

window.claimItem = async (itemId) => {
  alert("Claim request sent to the uploader!");
};