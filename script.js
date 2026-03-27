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

  // PROFILE PAGE LOGIC
  if (window.location.pathname.includes("profile.html")) {
    const emailDisplay = document.getElementById("userEmail");
    const roleDisplay = document.getElementById("userRole");
    const nameDisplay = document.getElementById("displayUsername");
    const avatarText = document.getElementById("avatarText");
    const countDisplay = document.getElementById("userReportCount");

    if (emailDisplay) emailDisplay.innerText = session.user.email;
    if (roleDisplay) roleDisplay.innerText = isAdmin ? "Administrator" : "User";

    const { data: profile } = await supabase.from('profiles').select('username').eq('id', session.user.id).single();
    if (profile?.username) {
        if (nameDisplay) nameDisplay.innerText = profile.username;
        if (avatarText) avatarText.innerText = profile.username.charAt(0).toUpperCase();
    }

    const { count } = await supabase.from('items').select('*', { count: 'exact', head: true }).eq('user_id', session.user.id);
    if (countDisplay) countDisplay.innerText = count || 0;
  }

  // HOME PAGE LOGIC (Filters out "resolved" items so they leave the home page)
  if (document.getElementById("itemsContainer")) {
    const { data: itemsWithProfiles } = await supabase
        .from("items")
        .select(`*, profiles(username)`)
        .eq("status", "approved"); // "resolved" items will naturally be hidden here
    
    allItems = itemsWithProfiles || [];
    renderItems(allItems);

    const searchInput = document.getElementById("searchInput");
    const typeFilter = document.getElementById("typeFilter");
    const categoryFilter = document.getElementById("categoryFilter");

    const runFilters = () => {
      const q = searchInput.value.toLowerCase();
      const t = typeFilter.value;
      const c = categoryFilter.value;

      const filtered = allItems.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(q) || item.location.toLowerCase().includes(q);
        const matchesType = t === "all" || item.type.toLowerCase() === t;
        const matchesCategory = c === "all" || item.category.toLowerCase() === c;
        return matchesSearch && matchesType && matchesCategory;
      });
      renderItems(filtered);
    };

    if (searchInput) searchInput.addEventListener("input", runFilters);
    if (typeFilter) typeFilter.addEventListener("change", runFilters);
    if (categoryFilter) categoryFilter.addEventListener("change", runFilters);
  }

  // ADMIN SECTION
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

  // UPLOAD LOGIC
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

  const isAdmin = document.querySelector('a[href="admin.html"]') !== null;

  container.innerHTML = items.length ? items.map(item => {
    const reporter = item.profiles?.username || "Anonymous";
    const isLost = item.type.toLowerCase() === 'lost';
    
    return `
      <div class="card">
        <img src="${item.image_url}" style="width:100%; height:200px; object-fit:cover;">
        <div style="padding: 1.5rem;">
          <span class="badge ${item.type}">${item.type.toUpperCase()}</span>
          <p style="font-size: 0.8rem; color: #666; margin: 5px 0;">Reporter: <strong>${reporter}</strong></p>
          <h3>${item.title}</h3>
          ${item.admin_note ? `<div style="background: #fff4e5; border-left: 4px solid #f59e0b; padding: 10px; margin: 10px 0; border-radius: 4px;"><p style="font-size: 0.85rem; margin: 0;">${item.admin_note}</p></div>` : ''}
          <p>Location: ${item.location}</p>
          <div style="display: flex; gap: 5px; margin-top: 15px;">
            <button onclick="window.notifyAdmin('${item.id}', '${item.title}', '${isLost ? 'found_report' : 'claim_request'}')" class="btn-approve" style="flex:1;">
              ${isLost ? "I Found It" : "Claim Item"}
            </button>
          </div>
          ${isAdmin ? `<button onclick="window.deleteItem('${item.id}')" style="background: #ef4444; color: white; width: 100%; margin-top: 10px; border: none; padding: 8px; border-radius: 6px; cursor: pointer;">Delete Report</button>` : ''}
        </div>
      </div>`;
  }).join("") : `<p>No items found.</p>`;
}

// 6. ACTION HELPERS
window.notifyAdmin = async (itemId, itemTitle, actionType) => {
  const { data: { session } } = await supabase.auth.getSession();
  const { error } = await supabase.from('notifications').insert([{
    item_id: itemId, user_id: session.user.id, user_email: session.user.email, item_title: itemTitle, action_type: actionType
  }]);
  if (error) alert(error.message);
  else alert("Admin notified!");
};

// 7. ADMIN FUNCTIONS
async function loadAdminDashboard() {
  // Select all items to calculate stats correctly
  const { data: items } = await supabase.from("items").select("*").order("created_at", { ascending: false });
  const tableBody = document.getElementById("adminTableBody");
  
  if (items) {
    const total = items.length;
    const lost = items.filter(item => item.type.toLowerCase() === 'lost').length;
    const found = items.filter(item => item.type.toLowerCase() === 'found').length;
    
    // NEW CALCULATION: Success Rate = (Resolved Items / Total Items) * 100
    const resolvedCount = items.filter(item => item.status === 'resolved').length;
    const successRate = total > 0 ? Math.round((resolvedCount / total) * 100) : 0;

    if (document.getElementById("adminTotal")) document.getElementById("adminTotal").innerText = total;
    if (document.getElementById("adminLost")) document.getElementById("adminLost").innerText = lost;
    if (document.getElementById("adminFound")) document.getElementById("adminFound").innerText = found;
    if (document.getElementById("adminSuccessRate")) document.getElementById("adminSuccessRate").innerText = successRate + "%";

    if (tableBody) {
      tableBody.innerHTML = items.map(item => `
        <tr>
          <td>
            <strong>${item.title}</strong> 
            <span style="font-size:0.65rem; padding:2px 4px; border-radius:3px; background:${item.status === 'pending' ? '#fef3c7' : '#dcfce7'};">
              ${item.status.toUpperCase()}
            </span>
          </td>
          <td><input type="text" id="note-${item.id}" value="${item.admin_note || ''}"></td>
          <td>${item.location}</td>
          <td>
            <button onclick="window.approveItem('${item.id}')">Approve</button>
            <button onclick="window.deleteItem('${item.id}')">Del</button>
          </td>
        </tr>`).join("");
    }
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
        <td>${n.action_type}</td>
        <td><input type="text" id="reply-${n.id}"></td>
        <td><button onclick="window.processActivity('${n.id}', '${n.item_id}', 'approved')">Confirm</button></td>
      </tr>`).join("");
  }
}

window.approveItem = async (id) => {
  const note = document.getElementById(`note-${id}`).value;
  await supabase.from("items").update({ status: 'approved', admin_note: note }).eq("id", id);
  location.reload();
};

// UPDATED: Instead of deleting, we change status to "resolved"
window.processActivity = async (notifId, itemId, decision) => {
    const comment = document.getElementById(`reply-${notifId}`).value;
    if (decision === 'approved') {
        // Mark as resolved. This hides it from the Home Page filter but keeps it for the Success Rate
        await supabase.from("items").update({ status: 'resolved', admin_note: comment }).eq("id", itemId);
        alert("Success! Item confirmed and resolved.");
    } else {
        await supabase.from("items").update({ admin_note: comment }).eq("id", itemId);
    }
    await supabase.from("notifications").delete().eq("id", notifId);
    location.reload();
};

window.deleteItem = async (id) => { 
  if(confirm("Delete item forever?")) { 
    await supabase.from("items").delete().eq("id", id); 
    location.reload(); 
  } 
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