import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// 1. CONFIGURATION
const supabaseUrl = "https://wdwvnojjjiodrtyrutgz.supabase.co";
const supabaseKey = "sb_publishable_o5Ah6hay4s3LIFV0dRrQtA_gmQoMDlI";
const supabase = createClient(supabaseUrl, supabaseKey);

const cloudName = "daxarj70f"; 
const uploadPreset = "unsigned_upload"; 

// 2. CLOUDINARY UPLOAD LOGIC
async function uploadImage(file) {
  const formData = new FormData();
  const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
  const blob = file.slice(0, file.size, file.type);
  const newFile = new File([blob], cleanName, {type: file.type});
  formData.append("file", newFile);
  formData.append("upload_preset", uploadPreset);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData
  });
  if (!res.ok) throw new Error("Cloudinary upload failed. Check your 'Unsigned' preset.");
  const data = await res.json();
  return data.secure_url;
}

// 3. MAIN UPLOAD FUNCTION
async function uploadItem(title, description, type, category, location, date, file) {
  try {
    const imageUrl = await uploadImage(file);
    const { error } = await supabase.from("items").insert([{ 
      title, description, type, category, location, date,
      status: 'pending', image_url: imageUrl 
    }]);
    if (error) throw error;
    alert("Item reported successfully!");
    window.location.href = "index.html";
  } catch (err) {
    alert("Upload Error: " + err.message);
  }
}

// 4. HOME PAGE & SEARCH RENDERER
function renderItems(items) {
  const container = document.getElementById("itemsContainer");
  if (!container) return;
  if (items.length === 0) {
    container.innerHTML = "<p style='text-align:center; width:100%;'>No items found.</p>";
    return;
  }
  container.innerHTML = items.map(item => `
    <div class="card">
      <img src="${item.image_url || 'https://via.placeholder.com/300'}" style="width:100%; height:200px; object-fit:cover; border-radius:8px;">
      <div style="padding:15px;">
        <span class="badge ${item.type}" style="text-transform:uppercase; font-weight:bold; font-size:12px;">${item.type}</span>
        <h3 style="margin:10px 0;">${item.title}</h3>
        <p style="color:#666; font-size:14px;">📍 ${item.location}</p>
        <p style="font-size:12px; color:#999;">${new Date(item.date).toLocaleDateString()}</p>
      </div>
    </div>
  `).join("");
}

// 5. DATA LOADERS
async function loadRecentItems() {
  const container = document.getElementById("itemsContainer");
  if (!container) return;

  // Change this to .select("*") if you want to see items BEFORE admin approval
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("status", "approved") 
    .order("created_at", { ascending: false })
    .limit(6);

  if (data) renderItems(data);
}

// 6. ADMIN DASHBOARD LOGIC
async function loadAdminDashboard() {
  const { data: items, error } = await supabase.from("items").select("*").order("created_at", { ascending: false });
  if (error) return;

  // Stats
  if(document.getElementById("totalItems")) document.getElementById("totalItems").textContent = items.length;
  if(document.getElementById("activeLost")) document.getElementById("activeLost").textContent = items.filter(i => i.type === 'lost').length;
  if(document.getElementById("activeFound")) document.getElementById("activeFound").textContent = items.filter(i => i.type === 'found').length;
  
  // Table Body
  const tableBody = document.getElementById("adminTableBody");
  if (tableBody) {
    tableBody.innerHTML = items.map(item => `
      <tr>
        <td>${item.title}</td>
        <td><span class="status-tag ${item.status}">${item.status}</span></td>
        <td>${item.type}</td>
        <td>${new Date(item.date).toLocaleDateString()}</td>
        <td>
          <button onclick="updateStatus('${item.id}', 'approved')" class="btn-approve">Approve</button>
          <button onclick="updateStatus('${item.id}', 'rejected')" class="btn-reject">Reject</button>
          <button onclick="deleteItem('${item.id}')" class="btn-delete">Delete</button>
        </td>
      </tr>`).join("");
  }
}

// 7. GLOBAL ADMIN ACTIONS
window.updateStatus = async (id, status) => {
  const { error } = await supabase.from("items").update({ status }).eq("id", id);
  if (error) alert(error.message);
  else loadAdminDashboard();
};

window.deleteItem = async (id) => {
  if (confirm("Delete this report permanently?")) {
    const { error } = await supabase.from("items").delete().eq("id", id);
    if (error) alert(error.message);
    else loadAdminDashboard();
  }
};

// 8. EVENT LISTENERS
document.addEventListener("DOMContentLoaded", async () => {
  const { data: { session } } = await supabase.auth.getSession();
  
  // Load Home Data
  loadRecentItems();

  // Load Admin/Profile Data
  if (session) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", session.user.id).single();
    
    if (document.getElementById("adminSection") && profile?.role === "admin") {
      document.getElementById("adminSection").style.display = "block";
      loadAdminDashboard();
    }
    
    if (document.getElementById("userEmail")) {
      document.getElementById("userEmail").textContent = session.user.email;
      document.getElementById("userRole").textContent = profile?.role || "user";
      document.getElementById("avatarText").textContent = session.user.email[0].toUpperCase();
    }
  }
});

// Search
const searchBtn = document.getElementById("searchBtn");
if (searchBtn) {
  searchBtn.addEventListener("click", async () => {
    const term = document.getElementById("searchInput").value;
    const { data } = await supabase.from("items").select("*").ilike("title", `%${term}%`);
    renderItems(data || []);
  });
}

// Upload Form
const uploadForm = document.getElementById("uploadForm");
if (uploadForm) {
  uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const type = e.target.querySelectorAll("select")[0].value;
    const title = e.target.querySelector("input[type=text]").value;
    const category = e.target.querySelectorAll("select")[1].value;
    const description = e.target.querySelector("textarea").value;
    const location = e.target.querySelectorAll("input[type=text]")[1].value;
    const date = e.target.querySelector("input[type=date]").value;
    const file = e.target.querySelector("#itemImage").files[0];
    await uploadItem(title, description, type, category, location, date, file);
  });
}

// Auth Forms
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = e.target.querySelector("input[type=email]").value;
    const password = e.target.querySelector("input[type=password]").value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    else window.location.href = "index.html";
  });
}

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "login.html";
  });
}