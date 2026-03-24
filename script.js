import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// 1. CONFIGURATION
const supabaseUrl = "https://wdwvnojjjiodrtyrutgz.supabase.co";
const supabaseKey = "sb_publishable_o5Ah6hay4s3LIFV0dRrQtA_gmQoMDlI";
const supabase = createClient(supabaseUrl, supabaseKey);

const cloudName = "daxarj70f"; 
const uploadPreset = "unsigned_upload"; 

// 2. THE GATEKEEPER
document.addEventListener("DOMContentLoaded", async () => {
  const { data: { session } } = await supabase.auth.getSession();
  const path = window.location.pathname;
  const isAuthPage = path.includes("login.html") || path.includes("register.html");

  if (!session && !isAuthPage) {
    window.location.href = "login.html";
    return;
  }

  let isAdmin = false;
  if (session) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
    isAdmin = profile?.role === 'admin';
  }

  renderNavbar(session, isAdmin);

  if (session && isAuthPage) {
    window.location.href = "index.html";
    return;
  }

  if (path.includes("admin.html") && !isAdmin) {
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
    loadNotifications(); 
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
        
        // Custom Admin Message for Users
        alert("Reported! Please Leave and Bring the item Here at the Admin Office for verification.");
        
        window.location.href = "index.html";
      } catch (err) { alert(err.message); btn.innerText = "Submit"; btn.disabled = false; }
    });
  }
}

// 5. ITEM RENDERING (Updated with Copy and Location Message)
function renderItems(items) {
  const container = document.getElementById("itemsContainer");
  if (!container) return;

  container.innerHTML = items.length ? items.map(item => {
    const isLostItem = item.type.toLowerCase() === 'lost';
    const buttonText = isLostItem ? "I Found It" : "Claim Item";
    const actionType = isLostItem ? "found_report" : "claim_request";

    return `
      <div class="card">
        <img src="${item.image_url}" style="width:100%; height:200px; object-fit:cover;">
        <div style="padding: 1.5rem;">
          <span class="badge ${item.type}">${item.type.toUpperCase()}</span>
          <h3>${item.title}</h3>
          
          <div style="background: #f0f7ff; padding: 10px; border-radius: 6px; border: 1px solid #cce3ff; margin: 10px 0;">
            <p style="font-size: 0.9rem; color: #1e40af; margin: 0;">📍 <strong>Location:</strong> ${item.location}</p>
          </div>

          <div style="display: flex; gap: 5px; margin-top: 15px;">
            <button onclick="window.notifyAdmin('${item.id}', '${item.title}', '${actionType}')" 
                    class="btn-approve" 
                    style="flex: 2; background: ${isLostItem ? '#10b981' : ''}">
              ${buttonText}
            </button>
            <button onclick="window.copyToClipboard('${item.title}', '${item.location}')" 
                    style="flex: 1; padding: 10px; cursor: pointer; border-radius: 6px; border: 1px solid #ccc; background: #fff;">
              Copy
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("") : `<p>No items found.</p>`;
}

// 6. ACTION HELPERS (Copy info)
window.copyToClipboard = (title, location) => {
  const text = `Item: ${title} | Location: ${location}`;
  navigator.clipboard.writeText(text).then(() => {
    alert("Item details copied to clipboard!");
  });
};

// 6. NOTIFICATION SYSTEM
window.notifyAdmin = async (itemId, itemTitle, actionType) => {
  const { data: { session } } = await supabase.auth.getSession();
  
  const { error } = await supabase.from('notifications').insert([{
    item_id: itemId,
    user_id: session.user.id,
    user_email: session.user.email,
    item_title: itemTitle,
    action_type: actionType
  }]);

  if (error) {
    alert("Error: " + error.message);
  } else {
    alert(actionType === 'found_report' ? "Admin notified that you found this!" : "Claim request sent to Admin!");
  }
};

async function loadNotifications() {
  const { data: notes } = await supabase.from("notifications").select("*").order("created_at", { ascending: false });
  const adminSection = document.getElementById("adminSection");
  
  let notifyTable = document.getElementById("notifyTableBody");
  if (!notifyTable) {
    const div = document.createElement('div');
    div.innerHTML = `
      <h2 style="margin: 2rem 0 1rem;">User Notifications (Claims & Finds)</h2>
      <div class="table-container">
        <table>
          <thead>
            <tr><th>User</th><th>Item</th><th>Action</th><th>Date</th></tr>
          </thead>
          <tbody id="notifyTableBody"></tbody>
        </table>
      </div>
    `;
    adminSection.appendChild(div);
    notifyTable = document.getElementById("notifyTableBody");
  }

  if (notes) {
    notifyTable.innerHTML = notes.map(n => `
      <tr>
        <td>${n.user_email}</td>
        <td>${n.item_title}</td>
        <td><span class="status-tag approved">${n.action_type.replace('_', ' ')}</span></td>
        <td>${new Date(n.created_at).toLocaleDateString()}</td>
      </tr>
    `).join("");
  }
}

// 7. AUTH & ADMIN HELPERS (Updated Approval & Editing)
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
        <td>
           <input type="text" value="${item.location}" 
                  onchange="window.updateLocation('${item.id}', this.value)"
                  style="padding: 5px; width: 120px; border: 1px solid #ddd; border-radius: 4px;">
        </td>
        <td>${new Date(item.created_at).toLocaleDateString()}</td>
        <td>
          <div style="display: flex; gap: 5px;">
            ${item.status === 'pending' ? `<button onclick="window.updateStatus('${item.id}', 'approved')" class="btn-approve">Approve</button>` : ''}
            <button onclick="window.deleteItem('${item.id}')" class="btn-delete" style="background: #ef4444; color: white; border: none; padding: 5px 10px; cursor: pointer; border-radius: 4px;">Delete</button>
          </div>
        </td>
      </tr>
    `).join("");
  }
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

// Updated Status: Changes location to 'Admin Office' on approval
window.updateStatus = async (id, status) => { 
  const updates = { status };
  if (status === 'approved') {
    updates.location = 'Admin Office';
  }
  await supabase.from("items").update(updates).eq("id", id); 
  location.reload(); 
};

// New: Allows Admin to edit location manually from the dashboard
window.updateLocation = async (id, newLoc) => {
  const { error } = await supabase.from("items").update({ location: newLoc }).eq("id", id);
  if (error) alert("Failed to update location");
};

window.deleteItem = async (id) => { 
  if(confirm("Are you sure you want to delete this item?")) { 
    await supabase.from("items").delete().eq("id", id); 
    location.reload(); 
  } 
};