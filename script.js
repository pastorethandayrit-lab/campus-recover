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
  if (!res.ok) throw new Error("Cloudinary upload failed.");
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

// 4. FORM EVENT LISTENERS
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

// 5. SEARCH LOGIC
const searchBtn = document.getElementById("searchBtn");
if (searchBtn) {
  searchBtn.addEventListener("click", async () => {
    const searchTerm = document.getElementById("searchInput").value;
    const { data } = await supabase.from("items").select("*").ilike("title", `%${searchTerm}%`);
    renderItems(data || []);
  });
}

// 6. HOMEPAGE LOADER
async function loadRecentItems() {
  const container = document.getElementById("itemsContainer");
  if (!container) return;
  const { data } = await supabase.from("items").select("*").eq("status", "approved").order("created_at", { ascending: false }).limit(6);
  renderItems(data || []);
}

function renderItems(items) {
  const container = document.getElementById("itemsContainer");
  if (!container) return;
  if (items.length === 0) {
    container.innerHTML = "<p>No items found.</p>";
    return;
  }
  container.innerHTML = items.map(item => `
    <div class="card">
      <img src="${item.image_url}" style="width:100%; height:180px; object-fit:cover; border-radius:8px;">
      <div style="padding:10px;">
        <span class="badge ${item.type}">${item.type}</span>
        <h3>${item.title}</h3>
        <p>${item.location}</p>
      </div>
    </div>
  `).join("");
}

// 7. ADMIN ACTIONS & STATS (NEW)
async function loadAdminDashboard() {
  const { data: items, error } = await supabase.from("items").select("*").order("created_at", { ascending: false });
  if (error) return;

  // Update Stats Cards
  document.getElementById("totalItems").textContent = items.length;
  document.getElementById("activeLost").textContent = items.filter(i => i.type === 'lost').length;
  document.getElementById("activeFound").textContent = items.filter(i => i.type === 'found').length;
  
  // Render Admin Table
  const tableBody = document.querySelector("#adminSection table tbody");
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

// Global functions for Admin Buttons
window.updateStatus = async (id, status) => {
  const { error } = await supabase.from("items").update({ status }).eq("id", id);
  if (error) alert(error.message);
  else loadAdminDashboard();
};

window.deleteItem = async (id) => {
  if (confirm("Are you sure you want to delete this report?")) {
    const { error } = await supabase.from("items").delete().eq("id", id);
    if (error) alert(error.message);
    else loadAdminDashboard();
  }
};

// 8. AUTH & PROFILE
async function checkAccess() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", session.user.id).single();

  const adminSection = document.getElementById("adminSection");
  if (adminSection && profile?.role === "admin") {
    adminSection.style.display = "block";
    loadAdminDashboard();
  }

  if (document.getElementById("userEmail")) {
    document.getElementById("userEmail").textContent = session.user.email;
    document.getElementById("userRole").textContent = profile?.role || "user";
    document.getElementById("avatarText").textContent = session.user.email[0].toUpperCase();
  }
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

// 9. INIT
document.addEventListener("DOMContentLoaded", () => {
  checkAccess();
  loadRecentItems();
});