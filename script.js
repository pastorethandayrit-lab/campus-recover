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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Please log in to report an item.");

    const imageUrl = await uploadImage(file);

    const { error } = await supabase.from("items").insert([{ 
      title, description, type, category, location, date,
      status: 'pending', 
      image_url: imageUrl,
      user_id: user.id 
    }]);

    if (error) throw error;
    alert("Item reported successfully!");
    window.location.href = "index.html";
  } catch (err) {
    alert("Upload Error: " + err.message);
  }
}

// 4. INTERACTION LOGIC (Exposed to Window)
window.claimItem = async (itemId, type) => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    alert("Please sign in to contact the owner!");
    window.location.href = "login.html";
    return;
  }

  // Check if user is claiming their own item
  const { data: item } = await supabase.from("items").select("user_id").eq("id", itemId).single();
  if (item && item.user_id === session.user.id) {
    alert("You posted this item!");
    return;
  }

  alert("Success! The " + (type === 'found' ? 'finder' : 'owner') + " has been notified of your request.");
};

// 5. RENDERING LOGIC
function renderItems(items) {
  const container = document.getElementById("itemsContainer");
  if (!container) return;
  
  if (items.length === 0) {
    container.innerHTML = "<p style='text-align:center; width:100%;'>No items found.</p>";
    return;
  }

  container.innerHTML = items.map(item => `
    <div class="card" style="border: 1px solid #eee; padding: 1rem; border-radius: 12px; background: #fff; box-shadow: 0 4px 6px rgba(0,0,0,0.05); text-align:center;">
      <img src="${item.image_url || 'https://via.placeholder.com/300'}" style="width:100%; height:180px; object-fit:cover; border-radius:8px;">
      <div style="margin-top:10px;">
        <span class="badge ${item.type}" style="text-transform:uppercase; font-weight:bold; font-size:12px; padding:2px 8px; border-radius:10px; background:${item.type === 'lost' ? '#fee2e2' : '#dcfce7'}; color:${item.type === 'lost' ? '#ef4444' : '#22c55e'}">${item.type}</span>
        <h3 style="margin:10px 0;">${item.title}</h3>
        <p style="font-size:14px; color:#666;">📍 ${item.location}</p>
        
        <button onclick="window.claimItem('${item.id}', '${item.type}')" 
                style="width:100%; padding:10px; margin-top:10px; background:#facc15; border:none; border-radius:6px; font-weight:bold; cursor:pointer;">
          ${item.type === 'found' ? 'Claim This Item' : 'I Found This!'}
        </button>
      </div>
    </div>
  `).join("");
}

// 6. DATA LOADERS
async function loadRecentItems() {
  const { data } = await supabase.from("items").select("*").eq("status", "approved").order("created_at", { ascending: false }).limit(6);
  if (data) renderItems(data);
}

// 7. ADMIN DASHBOARD
async function loadAdminDashboard() {
  const { data: items } = await supabase.from("items").select("*").order("created_at", { ascending: false });
  if (!items) return;

  if(document.getElementById("totalItems")) document.getElementById("totalItems").textContent = items.length;
  
  const tableBody = document.getElementById("adminTableBody");
  if (tableBody) {
    tableBody.innerHTML = items.map(item => `
      <tr>
        <td>${item.title}</td>
        <td>${item.status}</td>
        <td>${item.type}</td>
        <td>
          <button onclick="window.updateStatus('${item.id}', 'approved')" style="background:#22c55e; color:white; border:none; padding:5px; border-radius:4px; cursor:pointer;">Approve</button>
          <button onclick="window.deleteItem('${item.id}')" style="background:#ef4444; color:white; border:none; padding:5px; border-radius:4px; cursor:pointer;">Delete</button>
        </td>
      </tr>`).join("");
  }
}

window.updateStatus = async (id, status) => {
  await supabase.from("items").update({ status }).eq("id", id);
  loadAdminDashboard();
};

window.deleteItem = async (id) => {
  if (confirm("Delete permanently?")) {
    await supabase.from("items").delete().eq("id", id);
    loadAdminDashboard();
  }
};

// 8. INIT & AUTH
document.addEventListener("DOMContentLoaded", async () => {
  loadRecentItems();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", session.user.id).single();
    if (document.getElementById("adminSection") && profile?.role === "admin") {
      document.getElementById("adminSection").style.display = "block";
      loadAdminDashboard();
    }
  }
});

// Login/Logout/Upload listeners (rest of your standard code)
if (document.getElementById("uploadForm")) {
  document.getElementById("uploadForm").addEventListener("submit", async (e) => {
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