import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// 1. CONFIGURATION
const supabaseUrl = "https://wdwvnojjjiodrtyrutgz.supabase.co";
const supabaseKey = "sb_publishable_o5Ah6hay4s3LIFV0dRrQtA_gmQoMDlI";
const supabase = createClient(supabaseUrl, supabaseKey);

const cloudName = "daxarj70f"; 
const uploadPreset = "unsigned_upload"; 

let allItems = [];

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
  const loginForm = document.getElementById("loginForm");
  if (loginForm) loginForm.addEventListener("submit", (e) => handleAuth(e, 'login'));
  const regForm = document.getElementById("registerForm");
  if (regForm) regForm.addEventListener("submit", (e) => handleAuth(e, 'register'));

  if (!session) return;

  if (window.location.pathname.includes("profile.html")) {
    const emailDisplay = document.getElementById("userEmail");
    const roleDisplay = document.getElementById("userRole");
    const nameDisplay = document.getElementById("displayUsername");
    const avatarText = document.getElementById("avatarText");

    if (emailDisplay) emailDisplay.innerText = session.user.email;
    if (roleDisplay) roleDisplay.innerText = isAdmin ? "Administrator" : "User";

    const { data: profile } = await supabase.from('profiles').select('username').eq('id', session.user.id).single();
    if (profile?.username) {
        if (nameDisplay) nameDisplay.innerText = profile.username;
        if (avatarText) avatarText.innerText = profile.username.charAt(0).toUpperCase();
    }
  }

  if (document.getElementById("itemsContainer")) {
    const { data } = await supabase.from("items").select("*").eq("status", "approved");
    allItems = data || [];
    renderItems(allItems);

    const runFilters = () => {
      const q = document.getElementById("searchInput").value.toLowerCase();
      const t = document.getElementById("typeFilter").value;
      const c = document.getElementById("categoryFilter").value;

      const filtered = allItems.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(q) || item.location.toLowerCase().includes(q);
        const matchesType = t === "all" || item.type.toLowerCase() === t;
        const matchesCategory = c === "all" || item.category.toLowerCase() === c;
        return matchesSearch && matchesType && matchesCategory;
      });
      renderItems(filtered);
    };

    ["searchInput", "typeFilter", "categoryFilter"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(id === "searchInput" ? "input" : "change", runFilters);
    });
  }

  if (window.location.pathname.includes("admin.html") && isAdmin) {
    const section = document.getElementById("adminSection");
    if (section) section.style.display = "block";
    loadAdminDashboard();
    loadNotifications(); 
  }

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await supabase.auth.signOut();
      window.location.href = "login.html";
    });
  }

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
          type: upForm.querySelectorAll('select')[0].value,
          title: upForm.querySelectorAll('input')[0].value,
          category: upForm.querySelectorAll('select')[1].value,
          description: upForm.querySelector('textarea').value,
          location: upForm.querySelectorAll('input')[1].value,
          date: upForm.querySelectorAll('input')[2].value,
          image_url: imageUrl,
          user_id: session.user.id,
          status: 'pending'
        }]);

        if (error) throw error;
        alert("Reported! Please bring the item to the Admin Office.");
        window.location.href = "index.html";
      } catch (err) { 
        alert(err.message); 
        btn.innerText = "Submit Report"; btn.disabled = false; 
      }
    });
  }
}

// 5. ITEM RENDERING
function renderItems(items) {
  const container = document.getElementById("itemsContainer");
  if (!container) return;

  container.innerHTML = items.length ? items.map(item => {
    const isLostItem = item.type.toLowerCase() === 'lost';
    return `
      <div class="card">
        <img src="${item.image_url}" style="width:100%; height:200px; object-fit:cover;">
        <div style="padding: 1.5rem;">
          <span class="badge ${item.type}">${item.type.toUpperCase()}</span>
          <h3>${item.title}</h3>
          <p style="font-size: 0.9rem; color: #666;">📍 ${item.location} | 📅 ${new Date(item.date).toLocaleDateString()}</p>
          <div id="details-${item.id}" style="display: none; margin-top: 10px;">
            <p style="font-size: 0.85rem;">${item.description || "No description."}</p>
          </div>
          <div style="display: flex; gap: 5px; margin-top: 15px;">
            <button onclick="window.toggleDetails('details-${item.id}', this)" class="btn-details">Details</button>
            <button onclick="window.notifyAdmin('${item.id}', '${item.title}', '${isLostItem ? 'found_report' : 'claim_request'}')" class="btn-approve">
              ${isLostItem ? "I Found It" : "Claim Item"}
            </button>
          </div>
        </div>
      </div>`;
  }).join("") : `<p>No items found.</p>`;
}

// 6. ACTION HELPERS
window.toggleDetails = (id, btn) => {
  const el = document.getElementById(id);
  const isHidden = el.style.display === "none";
  el.style.display = isHidden ? "block" : "none";
  btn.innerText = isHidden ? "Hide" : "Details";
};

window.notifyAdmin = async (itemId, itemTitle, actionType) => {
  const { data: { session } } = await supabase.auth.getSession();
  const { error } = await supabase.from('notifications').insert([{
    item_id: itemId, user_id: session.user.id, user_email: session.user.email,
    item_title: itemTitle, action_type: actionType
  }]);
  alert(error ? error.message : "Admin notified!");
};

// 7. ADMIN FUNCTIONS
async function loadAdminDashboard() {
  const { data: items } = await supabase
    .from("items")
    .select(`*, profiles(username)`)
    .order("created_at", { ascending: false });
    
  const tableBody = document.getElementById("adminTableBody");
  if (items && tableBody) {
    document.getElementById("adminTotal").innerText = items.length;
    document.getElementById("adminLost").innerText = items.filter(i => i.type === 'lost').length;
    document.getElementById("adminFound").innerText = items.filter(i => i.type === 'found').length;

    tableBody.innerHTML = items.map(item => `
      <tr>
        <td><strong>${item.title}</strong><br><small>${new Date(item.date).toLocaleDateString()}</small></td>
        <td><strong>${item.profiles?.username || "Unknown"}</strong></td>
        <td><input type="text" id="note-${item.id}" value="${item.admin_note || ''}"></td>
        <td><input type="text" value="${item.location}" onchange="window.updateLocation('${item.id}', this.value)"></td>
        <td>
          <button onclick="window.approveItem('${item.id}')">Approve</button>
          <button onclick="window.deleteItem('${item.id}')" style="color:red">Del</button>
        </td>
      </tr>`).join("");
  }
}

async function loadNotifications() {
  const { data: notes } = await supabase.from("notifications").select("*").order("created_at", { ascending: false });
  const table = document.getElementById("notifyTableBody");
  if (table && notes) {
    table.innerHTML = notes.map(n => `
      <tr>
        <td>${n.user_email}</td>
        <td>${n.item_title}</td>
        <td>${n.action_type.replace('_', ' ')}</td>
        <td><input type="text" id="reply-${n.id}" placeholder="Note..."></td>
        <td><button onclick="window.processActivity('${n.id}', '${n.item_id}', 'approved')">Confirm</button></td>
      </tr>`).join("");
  }
}

window.processActivity = async (notifId, itemId, decision) => {
    const comment = document.getElementById(`reply-${notifId}`).value;
    if (decision === 'approved') {
        const { data: notification } = await supabase.from("notifications").select("action_type").eq("id", notifId).single();
        
        if (notification.action_type === 'claim_request') {
            await supabase.from("items").delete().eq("id", itemId);
            alert("Claim confirmed! Item deleted.");
        } else {
            await supabase.from("items").update({ type: 'found', admin_note: comment }).eq("id", itemId);
            alert("Report confirmed! Status updated to Found.");
        }
    }
    await supabase.from("notifications").delete().eq("id", notifId);
    location.reload();
};

window.approveItem = async (id) => {
  const note = document.getElementById(`note-${id}`).value;
  await supabase.from("items").update({ status: 'approved', admin_note: note }).eq("id", id);
  location.reload();
};

window.deleteItem = async (id) => { 
  if(confirm("Delete item?")) { await supabase.from("items").delete().eq("id", id); location.reload(); } 
};

window.updateLocation = async (id, newLoc) => {
  await supabase.from("items").update({ location: newLoc }).eq("id", id);
};

async function handleAuth(e, type) {
  e.preventDefault();
  const email = e.target.querySelector("input[type=email]").value;
  const password = e.target.querySelector("input[type=password]").value;
  const { error } = type === 'login' ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password });
  if (error) alert(error.message); else window.location.href = "index.html";
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