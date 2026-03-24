import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// 1. CONFIGURATION
const supabaseUrl = "https://wdwvnojjjiodrtyrutgz.supabase.co";
const supabaseKey = "sb_publishable_o5Ah6hay4s3LIFV0dRrQtA_gmQoMDlI";
const supabase = createClient(supabaseUrl, supabaseKey);

const cloudName = "daxarj70f"; 
const uploadPreset = "unsigned_upload"; 

// Global variable to hold our data for filtering
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

  // Home Page logic (Search & Filter)
  if (document.getElementById("itemsContainer")) {
    const { data } = await supabase.from("items").select("*").eq("status", "approved");
    allItems = data || [];
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

  // Admin section
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

  // REPORT UPLOAD LOGIC
  const upForm = document.getElementById("uploadForm");
  if (upForm) {
    upForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = upForm.querySelector('button');
      btn.innerText = "Uploading..."; btn.disabled = true;
      try {
        const file = upForm.querySelector('input[type="file"]').files[0];
        const imageUrl = await uploadImage(file);
        
        // Mapped to match your HTML structure exactly:
        const typeValue = upForm.querySelectorAll('select')[0].value;
        const titleValue = upForm.querySelectorAll('input')[0].value;    // First text input
        const categoryValue = upForm.querySelectorAll('select')[1].value; // Second dropdown
        const descValue = upForm.querySelector('textarea').value;
        const locValue = upForm.querySelectorAll('input')[1].value;      // Second text input
        const dateValue = upForm.querySelectorAll('input')[2].value;     // Third input (Date)

        const { error } = await supabase.from("items").insert([{ 
          type: typeValue,
          title: titleValue,
          category: categoryValue,
          description: descValue,
          location: locValue,
          date: dateValue,
          image_url: imageUrl,
          user_id: session.user.id,
          status: 'pending'
        }]);

        if (error) throw error;
        alert("Reported! Please bring the item to the Admin Office for verification.");
        window.location.href = "index.html";
      } catch (err) { 
        alert(err.message); 
        btn.innerText = "Submit Report"; 
        btn.disabled = false; 
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
    const buttonText = isLostItem ? "I Found It" : "Claim Item";
    const actionType = isLostItem ? "found_report" : "claim_request";
    const detailsId = `details-${item.id}`;
    const formattedDate = new Date(item.date).toLocaleDateString();

    return `
      <div class="card">
        <img src="${item.image_url}" style="width:100%; height:200px; object-fit:cover;">
        <div style="padding: 1.5rem;">
          <span class="badge ${item.type}">${item.type.toUpperCase()}</span>
          <h3>${item.title}</h3>
          <div style="background: #f0f7ff; padding: 10px; border-radius: 6px; border: 1px solid #cce3ff; margin: 10px 0;">
            <p style="font-size: 0.9rem; color: #1e40af; margin: 0;">📍 <strong>Location:</strong> ${item.location}</p>
            <p style="font-size: 0.8rem; color: #1e40af; margin-top: 4px;">📅 <strong>Date:</strong> ${formattedDate}</p>
          </div>
          <div id="${detailsId}" style="display: none; margin-top: 10px; padding-top: 10px; border-top: 1px dashed #ccc;">
            <p style="font-size: 0.85rem; color: #444;"><strong>Description:</strong> ${item.description || "No description."}</p>
            ${item.admin_note ? `<p style="font-size: 0.8rem; color: #ef4444; background: #fee2e2; padding: 5px; border-radius: 4px; margin-top: 5px;"><strong>Note:</strong> ${item.admin_note}</p>` : ''}
          </div>
          <div style="display: flex; gap: 5px; margin-top: 15px;">
            <button onclick="window.toggleDetails('${detailsId}', this)" 
                    style="flex: 1; padding: 10px; cursor: pointer; border-radius: 6px; border: 1px solid #ccc; background: #fff;">
              Details
            </button>
            <button onclick="window.notifyAdmin('${item.id}', '${item.title}', '${actionType}')" 
                    class="btn-approve" 
                    style="flex: 2; background: ${isLostItem ? '#10b981' : ''}">
              ${buttonText}
            </button>
          </div>
        </div>
      </div>
    `;
  }).join("") : `<p style="grid-column: 1/-1; text-align: center; color: #666;">No items found matching your search.</p>`;
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
    item_id: itemId,
    user_id: session.user.id,
    user_email: session.user.email,
    item_title: itemTitle,
    action_type: actionType
  }]);
  if (error) alert("Error: " + error.message);
  else alert(actionType === 'found_report' ? "Admin notified!" : "Claim request sent!");
};

// 7. ADMIN FUNCTIONS
async function loadAdminDashboard() {
  const { data: items } = await supabase.from("items").select("*").order("created_at", { ascending: false });
  const tableBody = document.getElementById("adminTableBody");
  
  if (items && tableBody) {
    tableBody.innerHTML = items.map(item => {
      const isPending = item.status === 'pending';
      return `
      <tr>
        <td>
          <strong>${item.title}</strong> 
          <span style="font-size:0.65rem; padding:2px 4px; border-radius:3px; background:${isPending ? '#fef3c7':'#dcfce7'}; color:${isPending ? '#92400e':'#166534'};">
            ${item.status.toUpperCase()}
          </span>
          <br><small style="color:gray;">${new Date(item.date).toLocaleDateString()}</small>
        </td>
        <td>
          <input type="text" id="note-${item.id}" value="${item.admin_note || ''}" style="width: 100px;">
        </td>
        <td>
           <input type="text" value="${item.location}" onchange="window.updateLocation('${item.id}', this.value)" style="width: 100px;">
        </td>
        <td>
          <button onclick="window.approveItem('${item.id}')">Approve</button>
          <button onclick="window.deleteItem('${item.id}')">Del</button>
        </td>
      </tr>`
    }).join("");
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

window.processActivity = async (notifId, itemId, decision) => {
  const comment = document.getElementById(`reply-${notifId}`).value;
  const updateData = { admin_note: comment };
  if (decision === 'approved') updateData.status = 'approved';
  await supabase.from("items").update(updateData).eq("id", itemId);
  await supabase.from("notifications").delete().eq("id", notifId);
  location.reload();
};

window.updateLocation = async (id, newLoc) => {
  await supabase.from("items").update({ location: newLoc }).eq("id", id);
};

window.deleteItem = async (id) => { 
  if(confirm("Delete item?")) { 
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