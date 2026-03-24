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
  const loginForm = document.getElementById("loginForm");
  if (loginForm) loginForm.addEventListener("submit", (e) => handleAuth(e, 'login'));
  const regForm = document.getElementById("registerForm");
  if (regForm) regForm.addEventListener("submit", (e) => handleAuth(e, 'register'));

  if (!session) return;

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

  if (window.location.pathname.includes("admin.html") && isAdmin) {
    const section = document.getElementById("adminSection");
    if (section) section.style.display = "block";
    loadAdminDashboard();
    loadNotifications(); 
  }

  if (document.getElementById("itemsContainer")) {
    const { data } = await supabase.from("items").select("*").eq("status", "approved");
    renderItems(data || []);
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
        alert("Reported! Please bring the item to the Admin Office for verification.");
        window.location.href = "index.html";
      } catch (err) { alert(err.message); btn.innerText = "Submit"; btn.disabled = false; }
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
  
  if (items) {
    if(document.getElementById("adminTotal")) document.getElementById("adminTotal").innerText = items.length;
    if(document.getElementById("adminLost")) document.getElementById("adminLost").innerText = items.filter(i => i.type === 'lost').length;
    if(document.getElementById("adminFound")) document.getElementById("adminFound").innerText = items.filter(i => i.type === 'found').length;

    if (tableBody) {
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
            <input type="text" id="note-${item.id}" placeholder="Note..." value="${item.admin_note || ''}" 
                   style="padding: 5px; width: 100px; border: 1px solid #ddd; border-radius: 4px;">
          </td>
          <td>
             <input type="text" value="${item.location}" onchange="window.updateLocation('${item.id}', this.value)"
                    style="padding: 5px; width: 100px; border: 1px solid #ddd; border-radius: 4px;">
          </td>
          <td>
            <div style="display: flex; gap: 4px;">
              ${isPending ? `<button onclick="window.approveItem('${item.id}')" style="background:#10b981; color:white; border:none; border-radius:4px; padding:5px; cursor:pointer;">Approve</button>` : '✅'}
              <button onclick="window.deleteItem('${item.id}')" class="btn-delete" 
                      style="background:#ef4444; color:white; border:none; border-radius:4px; padding:5px; cursor:pointer;">Del</button>
            </div>
          </td>
        </tr>
      `}).join("");
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
        <td><span class="badge ${n.action_type}" style="font-size:0.7rem;">${n.action_type.replace('_', ' ')}</span></td>
        <td>
          <input type="text" id="reply-${n.id}" placeholder="Admin comment..." 
                 style="padding: 5px; width: 150px; border: 1px solid #ddd; border-radius: 4px;">
        </td>
        <td>
          <div style="display: flex; gap: 5px;">
            <button onclick="window.processActivity('${n.id}', '${n.item_id}', 'approved')" 
                    style="background:#10b981; color:white; border:none; padding:5px 8px; border-radius:4px; cursor:pointer;">Confirm</button>
            <button onclick="window.processActivity('${n.id}', '${n.item_id}', 'rejected')" 
                    style="background:#64748b; color:white; border:none; padding:5px 8px; border-radius:4px; cursor:pointer;">Reject</button>
          </div>
        </td>
      </tr>
    `).join("");
  }
}

window.approveItem = async (id) => {
  const note = document.getElementById(`note-${id}`).value;
  const { error } = await supabase.from("items").update({ status: 'approved', admin_note: note }).eq("id", id);
  if (error) alert(error.message);
  else location.reload();
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
  try {
    const { error } = type === 'login' 
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    if (error) throw error;
    window.location.href = "index.html";
  } catch (err) { alert(err.message); }
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