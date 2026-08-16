const CONFIG = window.SUPABASE_CONFIG || {};
 
const validConfig =
  CONFIG.url &&
  CONFIG.anonKey &&
  CONFIG.adminEmail &&
  !CONFIG.url.includes("COLE_AQUI") &&
  !CONFIG.anonKey.includes("COLE_AQUI") &&
  !CONFIG.adminEmail.includes("SEU_EMAIL");

const supabaseClient = validConfig
  ? window.supabase.createClient(CONFIG.url, CONFIG.anonKey)
  : null;

const DEFAULT_SETTINGS = {
  site_title: "Meu Livro de Receitas",
  topbar_color: "#9580ff",
  background_1: "#5c73b5",
  background_2: "#16a98d",
  card_color: "#ffffff",
  button_color: "#6d55d8",
  text_color: "#111111",
  font_family: "Inter",
  base_font_size: 16,
  radius: 13
};

const state = {
  admin: false,
  editingId: null,
  editingImageUrl: null,
  recipes: [],
  settings: { ...DEFAULT_SETTINGS }
};

const $ = (id) => document.getElementById(id);

function toast(message) {
  const element = $("toast");
  element.textContent = message;
  element.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove("show"), 2600);
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

function openModal(id) {
  $(id).classList.remove("hidden");
}

function closeModal(id) {
  $(id).classList.add("hidden");
}

function showView(id) {
  ["home-view", "editor-view", "recipe-view"].forEach(view => {
    $(view).classList.add("hidden");
  });
  $(id).classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function applySettings(settings) {
  state.settings = { ...DEFAULT_SETTINGS, ...settings };
  const s = state.settings;

  document.documentElement.style.setProperty("--topbar", s.topbar_color);
  document.documentElement.style.setProperty("--background-1", s.background_1);
  document.documentElement.style.setProperty("--background-2", s.background_2);
  document.documentElement.style.setProperty("--card", s.card_color);
  document.documentElement.style.setProperty("--button", s.button_color);
  document.documentElement.style.setProperty("--text", s.text_color);
  document.documentElement.style.setProperty("--font", `"${s.font_family}", Arial, sans-serif`);
  document.documentElement.style.setProperty("--base-size", `${s.base_font_size}px`);
  document.documentElement.style.setProperty("--radius", `${s.radius}px`);

  $("site-title").textContent = s.site_title;
  document.title = s.site_title;
}

async function loadSettings() {
  if (!supabaseClient) {
    applySettings(
      JSON.parse(localStorage.getItem("recipe_settings_v2") || "null") ||
      DEFAULT_SETTINGS
    );
    return;
  }

  const { data, error } = await supabaseClient
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.error(error);
    applySettings(DEFAULT_SETTINGS);
    return;
  }

  applySettings(data || DEFAULT_SETTINGS);
}

function fillSettings() {
  const s = state.settings;

  $("set-title").value = s.site_title;
  $("set-topbar").value = s.topbar_color;
  $("set-bg1").value = s.background_1;
  $("set-bg2").value = s.background_2;
  $("set-card").value = s.card_color;
  $("set-button").value = s.button_color;
  $("set-text").value = s.text_color;
  $("set-font").value = s.font_family;
  $("set-size").value = s.base_font_size;
  $("set-radius").value = s.radius;
  $("size-value").textContent = `${s.base_font_size}px`;
  $("radius-value").textContent = `${s.radius}px`;
}

function readSettings() {
  return {
    site_title: $("set-title").value.trim() || DEFAULT_SETTINGS.site_title,
    topbar_color: $("set-topbar").value,
    background_1: $("set-bg1").value,
    background_2: $("set-bg2").value,
    card_color: $("set-card").value,
    button_color: $("set-button").value,
    text_color: $("set-text").value,
    font_family: $("set-font").value,
    base_font_size: Number($("set-size").value),
    radius: Number($("set-radius").value)
  };
}

async function saveSettings() {
  if (!state.admin) return;

  const settings = readSettings();
  applySettings(settings);

  if (!supabaseClient) {
    localStorage.setItem("recipe_settings_v2", JSON.stringify(settings));
    toast("Salvo localmente. Configure o Supabase para usar a nuvem.");
    return;
  }

  const { error } = await supabaseClient
    .from("site_settings")
    .upsert({ id: 1, ...settings }, { onConflict: "id" });

  if (error) {
    console.error(error);
    toast("O Supabase recusou a alteração.");
    return;
  }

  closeModal("settings-modal");
  toast("Personalização salva na nuvem!");
}

async function refreshAdminState() {
  if (!supabaseClient) {
    state.admin = false;
    updateAdminUI();
    return;
  }

  const { data: { session } } = await supabaseClient.auth.getSession();

  if (!session) {
    state.admin = false;
    updateAdminUI();
    return;
  }

  const { data, error } = await supabaseClient
    .from("admin_users")
    .select("user_id")
    .eq("user_id", session.user.id)
    .maybeSingle();

  state.admin = !error && !!data;
  updateAdminUI();
}

function updateAdminUI() {
  $("new-recipe-button").classList.toggle("hidden", !state.admin);
  $("settings-button").classList.toggle("hidden", !state.admin);
  $("logout-button").classList.toggle("hidden", !state.admin);
  $("admin-button").textContent = state.admin ? "admin ✓" : "admin";
}

async function login(password) {
  if (!supabaseClient) {
    toast("Configure primeiro o config.js do Supabase.");
    return;
  }

  const button = $("login-form").querySelector("button[type='submit']");
  button.disabled = true;

  /*
    O usuário não precisa digitar o e-mail.
    O e-mail do administrador fica somente na configuração do site
    e é usado internamente pelo Supabase Auth.

    O Supabase Auth exige um identificador (e-mail ou telefone) junto
    da senha; portanto, não existe signInWithPassword(password) puro.
    Para manter a interface somente com senha, usamos o e-mail
    configurado internamente.
  */
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: CONFIG.adminEmail,
    password
  });

  button.disabled = false;

  if (error) {
    console.error("Supabase Auth:", error);
    toast("Senha incorreta ou conta do administrador não encontrada.");
    return;
  }

  const { data: admin, error: adminError } = await supabaseClient
    .from("admin_users")
    .select("user_id")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (adminError) {
    console.error("Verificação de admin:", adminError);
    await supabaseClient.auth.signOut();
    toast("Login OK, mas a tabela de administradores não pôde ser consultada.");
    return;
  }

  if (!admin) {
    await supabaseClient.auth.signOut();
    toast("Esta conta não está cadastrada como administrador.");
    return;
  }

  state.admin = true;
  $("admin-password").value = "";
  closeModal("login-modal");
  updateAdminUI();
  renderRecipes();
  toast("Modo admin ativado.");
}

async function logout() {
  if (supabaseClient) {
    await supabaseClient.auth.signOut();
  }

  state.admin = false;
  updateAdminUI();
  showView("home-view");
  toast("Sessão encerrada.");
}

async function loadRecipes() {
  if (!supabaseClient) {
    state.recipes = JSON.parse(localStorage.getItem("recipes_v2") || "[]");
    renderRecipes();
    return;
  }

  const { data, error } = await supabaseClient
    .from("recipes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    toast("Erro ao carregar as receitas.");
    state.recipes = [];
  } else {
    state.recipes = data || [];
  }

  renderRecipes();
}

function saveLocalRecipes() {
  localStorage.setItem("recipes_v2", JSON.stringify(state.recipes));
}

function placeholderImage() {
  return "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="900" height="600">
        <rect width="100%" height="100%" fill="#dedede"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
          font-family="Arial" font-size="38" fill="#777">🍽️ Sem foto</text>
      </svg>
    `);
}

function renderRecipes() {
  const grid = $("recipe-grid");
  grid.innerHTML = "";

  $("empty-state").classList.toggle("hidden", state.recipes.length !== 0);

  state.recipes.forEach(recipe => {
    const card = document.createElement("article");
    card.className = "recipe-card";

    card.innerHTML = `
      <img class="recipe-card-image"
        src="${escapeHTML(recipe.image_url || placeholderImage())}"
        alt="${escapeHTML(recipe.title)}">

      ${state.admin ? `
        <div class="recipe-card-admin">
          <button class="card-icon edit-card" type="button" title="Editar">✎</button>
          <button class="card-icon delete-card" type="button" title="Excluir">▣</button>
        </div>
      ` : ""}

      <div class="recipe-card-body">
        <h3 class="recipe-card-title">${escapeHTML(recipe.title)}</h3>
        <div class="recipe-card-info">
          ${(recipe.ingredients || []).length} ingredientes · ${(recipe.steps || []).length} etapas
        </div>
        <div class="recipe-card-enter">Clique para abrir</div>
      </div>
    `;

    card.addEventListener("click", () => openRecipe(recipe.id));

    card.querySelector(".edit-card")?.addEventListener("click", event => {
      event.stopPropagation();
      editRecipe(recipe.id);
    });

    card.querySelector(".delete-card")?.addEventListener("click", event => {
      event.stopPropagation();
      deleteRecipe(recipe.id);
    });

    grid.appendChild(card);
  });
}

function addRow(containerId, value = "", kind = "ingredient") {
  const container = $(containerId);
  const row = document.createElement("div");
  row.className = "dynamic-row";

  const number = document.createElement("span");
  number.className = "row-number";
  number.textContent = container.children.length + 1;

  const input = document.createElement("input");
  input.className = "input";
  input.type = "text";
  input.maxLength = 300;
  input.required = true;
  input.value = value;
  input.placeholder =
    kind === "ingredient"
      ? "Ex.: 2 xícaras de farinha"
      : "Ex.: Misture todos os ingredientes...";

  const remove = document.createElement("button");
  remove.className = "delete-row";
  remove.type = "button";
  remove.textContent = "×";
  remove.title = "Remover";

  remove.addEventListener("click", () => {
    if (container.children.length === 1) {
      input.value = "";
      input.focus();
      return;
    }

    row.remove();
    renumber(container);
  });

  row.append(number, input, remove);
  container.appendChild(row);
}

function renumber(container) {
  [...container.children].forEach((row, index) => {
    row.querySelector(".row-number").textContent = index + 1;
  });
}

function valuesFrom(containerId) {
  return [...$(containerId).querySelectorAll("input")]
    .map(input => input.value.trim())
    .filter(Boolean);
}

function resetEditor() {
  state.editingId = null;
  state.editingImageUrl = null;

  $("editor-title").textContent = "🍳 Nova receita";
  $("recipe-form").reset();
  $("ingredients-list").innerHTML = "";
  $("steps-list").innerHTML = "";

  addRow("ingredients-list", "", "ingredient");
  addRow("steps-list", "", "step");

  $("image-preview-wrap").classList.add("hidden");
  $("image-preview").removeAttribute("src");
  $("image-name").textContent = "Nenhuma imagem selecionada";
}

function startNewRecipe() {
  if (!state.admin) {
    openModal("login-modal");
    return;
  }

  resetEditor();
  showView("editor-view");
}

function editRecipe(id) {
  if (!state.admin) return;

  const recipe = state.recipes.find(item => item.id === id);
  if (!recipe) return;

  state.editingId = id;
  state.editingImageUrl = recipe.image_url || null;

  $("editor-title").textContent = "✏️ Editar receita";
  $("recipe-name").value = recipe.title;

  $("ingredients-list").innerHTML = "";
  $("steps-list").innerHTML = "";

  (recipe.ingredients?.length ? recipe.ingredients : [""])
    .forEach(value => addRow("ingredients-list", value, "ingredient"));

  (recipe.steps?.length ? recipe.steps : [""])
    .forEach(value => addRow("steps-list", value, "step"));

  if (recipe.image_url) {
    $("image-preview").src = recipe.image_url;
    $("image-preview-wrap").classList.remove("hidden");
    $("image-name").textContent = "Imagem atual";
  }

  showView("editor-view");
}

async function uploadImage(file) {
  if (!supabaseClient) return URL.createObjectURL(file);

  const extension = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${crypto.randomUUID()}.${extension}`;

  const { error } = await supabaseClient.storage
    .from("recipe-images")
    .upload(path, file, {
      upsert: false,
      contentType: file.type
    });

  if (error) throw error;

  return supabaseClient.storage
    .from("recipe-images")
    .getPublicUrl(path).data.publicUrl;
}

async function deleteStorageImage(url) {
  if (!supabaseClient || !url) return;

  const marker = "/storage/v1/object/public/recipe-images/";
  const index = url.indexOf(marker);

  if (index === -1) return;

  const path = decodeURIComponent(url.slice(index + marker.length));

  await supabaseClient.storage
    .from("recipe-images")
    .remove([path]);
}

async function saveRecipe(event) {
  event.preventDefault();

  if (!state.admin) {
    openModal("login-modal");
    return;
  }

  const title = $("recipe-name").value.trim();
  const ingredients = valuesFrom("ingredients-list");
  const steps = valuesFrom("steps-list");

  if (!title || !ingredients.length || !steps.length) {
    toast("Preencha nome, ingredientes e modo de preparo.");
    return;
  }

  const submit = $("recipe-form").querySelector("button[type='submit']");
  submit.disabled = true;

  try {
    let imageUrl = state.editingImageUrl;
    const image = $("recipe-image").files[0];

    if (image) {
      imageUrl = await uploadImage(image);
    }

    const payload = {
      title,
      image_url: imageUrl,
      ingredients,
      steps
    };

    if (!supabaseClient) {
      const id = state.editingId || crypto.randomUUID();
      const item = {
        id,
        ...payload,
        created_at: new Date().toISOString()
      };

      const index = state.recipes.findIndex(recipe => recipe.id === id);

      if (index >= 0) {
        state.recipes[index] = { ...state.recipes[index], ...item };
      } else {
        state.recipes.unshift(item);
      }

      saveLocalRecipes();
    } else if (state.editingId) {
      const { error } = await supabaseClient
        .from("recipes")
        .update(payload)
        .eq("id", state.editingId);

      if (error) throw error;
    } else {
      const { error } = await supabaseClient
        .from("recipes")
        .insert(payload);

      if (error) throw error;
    }

    toast("Receita salva!");
    await loadRecipes();
    showView("home-view");
  } catch (error) {
    console.error(error);
    toast("Erro ao salvar a receita.");
  } finally {
    submit.disabled = false;
  }
}

function openRecipe(id) {
  const recipe = state.recipes.find(item => item.id === id);
  if (!recipe) return;

  const ingredients = (recipe.ingredients || [])
    .map(item => `<li>${escapeHTML(item)}</li>`)
    .join("");

  const steps = (recipe.steps || [])
    .map(item => `<li><div>${escapeHTML(item)}</div></li>`)
    .join("");

  $("recipe-detail").innerHTML = `
    ${recipe.image_url ? `
      <img class="detail-image"
        src="${escapeHTML(recipe.image_url)}"
        alt="${escapeHTML(recipe.title)}">
    ` : ""}

    <h1 class="detail-title">${escapeHTML(recipe.title)}</h1>

    <div class="detail-columns">
      <section>
        <h3>🧂 Ingredientes</h3>
        <ul class="ingredients">${ingredients}</ul>
      </section>

      <section>
        <h3>👨‍🍳 Modo de preparo</h3>
        <ol class="steps">${steps}</ol>
      </section>
    </div>

    ${state.admin ? `
      <div class="detail-admin-actions">
        <button id="detail-edit" class="action-button" type="button">✎ Editar</button>
        <button id="detail-delete" class="action-button" type="button">🗑 Excluir</button>
      </div>
    ` : ""}
  `;

  $("detail-edit")?.addEventListener("click", () => editRecipe(id));
  $("detail-delete")?.addEventListener("click", () => deleteRecipe(id));

  showView("recipe-view");
}

async function deleteRecipe(id) {
  if (!state.admin) return;

  const recipe = state.recipes.find(item => item.id === id);
  if (!recipe) return;

  if (!confirm(`Excluir "${recipe.title}"?`)) return;

  try {
    if (!supabaseClient) {
      state.recipes = state.recipes.filter(item => item.id !== id);
      saveLocalRecipes();
    } else {
      const { error } = await supabaseClient
        .from("recipes")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await deleteStorageImage(recipe.image_url);
    }

    await loadRecipes();
    showView("home-view");
    toast("Receita excluída.");
  } catch (error) {
    console.error(error);
    toast("Erro ao excluir a receita.");
  }
}

function setupEvents() {
  $("admin-button").addEventListener("click", async () => {
    if (state.admin) {
      await logout();
    } else {
      openModal("login-modal");
      setTimeout(() => $("admin-password").focus(), 50);
    }
  });

  $("login-form").addEventListener("submit", event => {
    event.preventDefault();
    login($("admin-password").value);
  });

  $("new-recipe-button").addEventListener("click", startNewRecipe);

  $("settings-button").addEventListener("click", () => {
    fillSettings();
    openModal("settings-modal");
  });

  $("logout-button").addEventListener("click", logout);

  $("back-home-button").addEventListener("click", () => showView("home-view"));
  $("cancel-editor-button").addEventListener("click", () => showView("home-view"));
  $("back-recipe-button").addEventListener("click", () => showView("home-view"));

  $("select-image-button").addEventListener("click", () => {
    $("recipe-image").click();
  });

  $("recipe-image").addEventListener("change", () => {
    const file = $("recipe-image").files[0];
    if (!file) return;

    $("image-name").textContent = file.name;
    $("image-preview").src = URL.createObjectURL(file);
    $("image-preview-wrap").classList.remove("hidden");
  });

  $("remove-image-button").addEventListener("click", () => {
    $("recipe-image").value = "";
    state.editingImageUrl = null;
    $("image-preview").removeAttribute("src");
    $("image-preview-wrap").classList.add("hidden");
    $("image-name").textContent = "Nenhuma imagem selecionada";
  });

  $("add-ingredient-button").addEventListener("click", () => {
    addRow("ingredients-list", "", "ingredient");
  });

  $("add-step-button").addEventListener("click", () => {
    addRow("steps-list", "", "step");
  });

  $("recipe-form").addEventListener("submit", saveRecipe);

  $("set-size").addEventListener("input", event => {
    $("size-value").textContent = `${event.target.value}px`;
  });

  $("set-radius").addEventListener("input", event => {
    $("radius-value").textContent = `${event.target.value}px`;
  });

  $("save-settings-button").addEventListener("click", saveSettings);

  $("reset-settings-button").addEventListener("click", () => {
    applySettings(DEFAULT_SETTINGS);
    fillSettings();
  });

  document.querySelectorAll("[data-close]").forEach(button => {
    button.addEventListener("click", () => {
      closeModal(button.dataset.close);
    });
  });

  document.querySelectorAll(".modal").forEach(modal => {
    modal.addEventListener("click", event => {
      if (event.target === modal) closeModal(modal.id);
    });
  });
}

async function init() {
  setupEvents();

  resetEditor();
  await loadSettings();

  if (supabaseClient) {
    supabaseClient.auth.onAuthStateChange(() => {
      setTimeout(refreshAdminState, 0);
    });
  }

  await refreshAdminState();
  await loadRecipes();

  if (!supabaseClient) {
    toast("Modo local: configure o Supabase para ativar a nuvem.");
  }
}

init();
