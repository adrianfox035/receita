const CONFIG = {
  url: "https://hwhihebohjuwooeehivq.supabase.co",
  anonKey: "sb_publishable_CvZndoci7xeL9WJyKWtAGg_EOeilYFe"
};

const validConfig = Boolean(
  CONFIG.url &&
  CONFIG.anonKey &&
  CONFIG.url.startsWith("https://") &&
  CONFIG.anonKey.startsWith("sb_publishable_")
);

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
  folders: [],
  recipes: [],
  currentFolderId: null,
  editingId: null,
  editingImageUrl: null,
  editingFolderId: null,
  editingFolderImageUrl: null,
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
  ["home-view", "folder-view", "editor-view", "recipe-view"].forEach(view => {
    $(view).classList.add("hidden");
  });
  $(id).classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function currentFolder() {
  return state.folders.find(folder => folder.id === state.currentFolderId) || null;
}

/* ---------------- SETTINGS (aparência do site) ---------------- */

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
      JSON.parse(localStorage.getItem("recipe_settings_v3") || "null") ||
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
    localStorage.setItem("recipe_settings_v3", JSON.stringify(settings));
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

/* ---------------- ADMIN / LOGIN ---------------- */

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
  $("new-folder-button").classList.toggle("hidden", !state.admin);
  $("settings-button").classList.toggle("hidden", !state.admin);
  $("logout-button").classList.toggle("hidden", !state.admin);
  $("new-recipe-button").classList.toggle("hidden", !state.admin);
  $("edit-folder-button").classList.toggle("hidden", !state.admin);
  $("delete-folder-button").classList.toggle("hidden", !state.admin);
  $("admin-button").textContent = state.admin ? "admin ✓" : "admin";

  // Re-renderiza o que estiver na tela para mostrar/esconder os ícones de admin nos cards
  renderFolders();
  if (state.currentFolderId) renderFolderRecipes();
}

async function login(password) {
  if (!supabaseClient) {
    toast("Configure o Supabase antes de entrar como admin.");
    return;
  }

  const button = $("login-form").querySelector("button[type='submit']");
  button.disabled = true;

  try {
    if (!password || !password.trim()) {
      toast("Digite a senha.");
      return;
    }

    // 1. Verifica se já existe uma sessão.
    const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();

    if (sessionError) {
      console.error("Erro ao obter sessão:", sessionError);
      toast("Erro ao verificar a sessão.");
      return;
    }

    // 2. Se não houver sessão, cria uma sessão anônima (sem e-mail).
    if (!sessionData.session) {
      const { data: anonymousData, error: anonymousError } = await supabaseClient.auth.signInAnonymously();

      if (anonymousError) {
        console.error("Erro no Anonymous Auth:", anonymousError);
        toast("Não foi possível iniciar a sessão.");
        return;
      }

      if (!anonymousData.session) {
        toast("O Supabase não criou uma sessão.");
        return;
      }
    }

    // 3. A senha é verificada no PostgreSQL (RPC), nunca fica no JS do cliente.
    // IMPORTANTE: a função verify_admin_password precisa, ao aprovar a senha,
    // inserir o auth.uid() atual na tabela admin_users (via SECURITY DEFINER).
    // Sem isso, o admin some ao recarregar a página, pois refreshAdminState()
    // depende dessa tabela para saber quem é admin.
    const { data: authorized, error: passwordError } = await supabaseClient.rpc(
      "verify_admin_password",
      { p_password: password }
    );

    if (passwordError) {
      console.error("Erro na verificação da senha:", passwordError);
      toast("Erro ao verificar a senha no Supabase.");
      return;
    }

    if (authorized !== true) {
      state.admin = false;
      updateAdminUI();
      toast("Senha incorreta.");
      return;
    }

    // 4. Senha correta.
    state.admin = true;
    $("admin-password").value = "";
    closeModal("login-modal");
    updateAdminUI();
    toast("Modo admin ativado.");
  } catch (error) {
    console.error("Erro inesperado no login:", error);
    toast("Não foi possível entrar como administrador.");
  } finally {
    button.disabled = false;
  }
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

/* ---------------- PASTAS ---------------- */

async function loadFolders() {
  if (!supabaseClient) {
    state.folders = JSON.parse(localStorage.getItem("folders_v1") || "[]");
    renderFolders();
    return;
  }

  const { data, error } = await supabaseClient
    .from("folders")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    toast("Erro ao carregar as pastas.");
    state.folders = [];
  } else {
    state.folders = data || [];
  }

  renderFolders();
}

function saveLocalFolders() {
  localStorage.setItem("folders_v1", JSON.stringify(state.folders));
}

function placeholderImage(icon = "🍽️", label = "Sem foto") {
  return "data:image/svg+xml;charset=UTF-8," +
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="900" height="600">
        <rect width="100%" height="100%" fill="#dedede"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
          font-family="Arial" font-size="38" fill="#777">${icon} ${label}</text>
      </svg>
    `);
}

function recipeCountLabel(count) {
  return count === 1 ? "1 receita" : `${count} receitas`;
}

function renderFolders() {
  const grid = $("folder-grid");
  if (!grid) return;
  grid.innerHTML = "";

  $("folders-empty-state").classList.toggle("hidden", state.folders.length !== 0);

  state.folders.forEach(folder => {
    const count = state.recipes.filter(recipe => recipe.folder_id === folder.id).length
      ?? 0;
    const total = folder.recipe_count ?? count;

    const card = document.createElement("article");
    card.className = "recipe-card";

    card.innerHTML = `
      <img class="recipe-card-image"
        src="${escapeHTML(folder.image_url || placeholderImage("📁", "Sem imagem"))}"
        alt="${escapeHTML(folder.name)}">

      ${state.admin ? `
        <div class="recipe-card-admin">
          <button class="card-icon edit-folder-card" type="button" title="Editar">✎</button>
          <button class="card-icon delete-folder-card" type="button" title="Excluir">▣</button>
        </div>
      ` : ""}

      <div class="recipe-card-body">
        <h3 class="recipe-card-title">${escapeHTML(folder.name)}</h3>
        <div class="recipe-card-info">${recipeCountLabel(total)}</div>
        <div class="recipe-card-enter">Clique para entrar</div>
      </div>
    `;

    card.addEventListener("click", () => openFolder(folder.id));

    card.querySelector(".edit-folder-card")?.addEventListener("click", event => {
      event.stopPropagation();
      editFolder(folder.id);
    });

    card.querySelector(".delete-folder-card")?.addEventListener("click", event => {
      event.stopPropagation();
      deleteFolder(folder.id);
    });

    grid.appendChild(card);
  });
}

function resetFolderEditor() {
  state.editingFolderId = null;
  state.editingFolderImageUrl = null;

  $("folder-modal-title").textContent = "Nova pasta";
  $("folder-form").reset();
  $("folder-image-preview-wrap").classList.add("hidden");
  $("folder-image-preview").removeAttribute("src");
  $("folder-image-name").textContent = "Nenhuma imagem selecionada";
}

function startNewFolder() {
  if (!state.admin) {
    openModal("login-modal");
    return;
  }

  resetFolderEditor();
  openModal("folder-modal");
}

function editFolder(id) {
  if (!state.admin) return;

  const folder = state.folders.find(item => item.id === id);
  if (!folder) return;

  state.editingFolderId = id;
  state.editingFolderImageUrl = folder.image_url || null;

  $("folder-modal-title").textContent = "Editar pasta";
  $("folder-name").value = folder.name;

  if (folder.image_url) {
    $("folder-image-preview").src = folder.image_url;
    $("folder-image-preview-wrap").classList.remove("hidden");
    $("folder-image-name").textContent = "Imagem atual";
  } else {
    $("folder-image-preview-wrap").classList.add("hidden");
    $("folder-image-name").textContent = "Nenhuma imagem selecionada";
  }

  openModal("folder-modal");
}

async function uploadToBucket(file, bucket) {
  if (!supabaseClient) return URL.createObjectURL(file);

  const extension = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${crypto.randomUUID()}.${extension}`;

  const { error } = await supabaseClient.storage
    .from(bucket)
    .upload(path, file, { upsert: false, contentType: file.type });

  if (error) throw error;

  return supabaseClient.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

async function deleteFromBucket(url, bucket) {
  if (!supabaseClient || !url) return;

  const marker = `/storage/v1/object/public/${bucket}/`;
  const index = url.indexOf(marker);
  if (index === -1) return;

  const path = decodeURIComponent(url.slice(index + marker.length));
  await supabaseClient.storage.from(bucket).remove([path]);
}

async function saveFolder(event) {
  event.preventDefault();

  if (!state.admin) {
    openModal("login-modal");
    return;
  }

  const name = $("folder-name").value.trim();
  if (!name) {
    toast("Dê um nome para a pasta.");
    return;
  }

  const submit = $("folder-form").querySelector("button[type='submit']");
  submit.disabled = true;

  try {
    let imageUrl = state.editingFolderImageUrl;
    const image = $("folder-image").files[0];

    if (image) {
      imageUrl = await uploadToBucket(image, "folder-images");
    }

    const payload = { name, image_url: imageUrl };

    if (!supabaseClient) {
      const id = state.editingFolderId || crypto.randomUUID();
      const index = state.folders.findIndex(folder => folder.id === id);

      if (index >= 0) {
        state.folders[index] = { ...state.folders[index], ...payload };
      } else {
        state.folders.unshift({ id, ...payload, created_at: new Date().toISOString() });
      }

      saveLocalFolders();
    } else if (state.editingFolderId) {
      const { error } = await supabaseClient
        .from("folders")
        .update(payload)
        .eq("id", state.editingFolderId);

      if (error) throw error;
    } else {
      const { error } = await supabaseClient
        .from("folders")
        .insert(payload);

      if (error) throw error;
    }

    closeModal("folder-modal");
    toast("Pasta salva!");
    await loadFolders();
  } catch (error) {
    console.error(error);
    toast("Erro ao salvar a pasta.");
  } finally {
    submit.disabled = false;
  }
}

async function deleteFolder(id) {
  if (!state.admin) return;

  const folder = state.folders.find(item => item.id === id);
  if (!folder) return;

  const hasRecipes = state.recipes.some(recipe => recipe.folder_id === id);
  const warning = hasRecipes
    ? `Excluir "${folder.name}"? As receitas dentro dela também serão apagadas.`
    : `Excluir "${folder.name}"?`;

  if (!confirm(warning)) return;

  try {
    if (!supabaseClient) {
      state.folders = state.folders.filter(item => item.id !== id);
      state.recipes = state.recipes.filter(recipe => recipe.folder_id !== id);
      saveLocalFolders();
      saveLocalRecipes();
    } else {
      const { error } = await supabaseClient
        .from("folders")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await deleteFromBucket(folder.image_url, "folder-images");
    }

    if (state.currentFolderId === id) {
      state.currentFolderId = null;
      showView("home-view");
    }

    await loadFolders();
    toast("Pasta excluída.");
  } catch (error) {
    console.error(error);
    toast("Erro ao excluir a pasta.");
  }
}

function openFolder(id) {
  const folder = state.folders.find(item => item.id === id);
  if (!folder) return;

  state.currentFolderId = id;
  $("folder-view-title").textContent = `🍴 ${folder.name}`;
  $("folder-view-subtitle").textContent = "Receitas desta pasta.";

  showView("folder-view");
  loadRecipesForFolder(id);
}

/* ---------------- RECEITAS (dentro de uma pasta) ---------------- */

async function loadRecipesForFolder(folderId) {
  if (!supabaseClient) {
    state.recipes = JSON.parse(localStorage.getItem("recipes_v3") || "[]");
    renderFolderRecipes();
    return;
  }

  const { data, error } = await supabaseClient
    .from("recipes")
    .select("*")
    .eq("folder_id", folderId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    toast("Erro ao carregar as receitas.");
    state.recipes = state.recipes.filter(recipe => recipe.folder_id !== folderId);
  } else {
    state.recipes = [
      ...state.recipes.filter(recipe => recipe.folder_id !== folderId),
      ...(data || [])
    ];
  }

  renderFolderRecipes();
}

function saveLocalRecipes() {
  localStorage.setItem("recipes_v3", JSON.stringify(state.recipes));
}

function recipesInCurrentFolder() {
  return state.recipes.filter(recipe => recipe.folder_id === state.currentFolderId);
}

function renderFolderRecipes() {
  const list = $("folder-recipe-list");
  if (!list) return;

  const recipes = recipesInCurrentFolder();
  list.innerHTML = "";

  $("folder-recipes-empty").classList.toggle("hidden", recipes.length !== 0);

  recipes.forEach(recipe => {
    const item = document.createElement("article");
    item.className = "quick-item";

    item.innerHTML = `
      <img class="quick-item-image"
        src="${escapeHTML(recipe.image_url || placeholderImage())}"
        alt="${escapeHTML(recipe.title)}">

      <div>
        <div class="quick-item-title">${escapeHTML(recipe.title)}</div>
        <div class="quick-item-info">
          ${(recipe.ingredients || []).length} ingredientes · ${(recipe.steps || []).length} etapas
        </div>
      </div>

      ${state.admin ? `
        <div class="quick-item-admin">
          <button class="card-icon edit-recipe-item" type="button" title="Editar">✎</button>
          <button class="card-icon delete-recipe-item" type="button" title="Excluir">▣</button>
        </div>
      ` : "<span></span>"}
    `;

    item.addEventListener("click", () => openRecipe(recipe.id));

    item.querySelector(".edit-recipe-item")?.addEventListener("click", event => {
      event.stopPropagation();
      editRecipe(recipe.id);
    });

    item.querySelector(".delete-recipe-item")?.addEventListener("click", event => {
      event.stopPropagation();
      deleteRecipe(recipe.id);
    });

    list.appendChild(item);
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

  if (!state.currentFolderId) {
    toast("Abra uma pasta antes de criar uma receita.");
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
  } else {
    $("image-preview-wrap").classList.add("hidden");
    $("image-name").textContent = "Nenhuma imagem selecionada";
  }

  showView("editor-view");
}

async function saveRecipe(event) {
  event.preventDefault();

  if (!state.admin) {
    openModal("login-modal");
    return;
  }

  if (!state.currentFolderId) {
    toast("Nenhuma pasta selecionada.");
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
      imageUrl = await uploadToBucket(image, "recipe-images");
    }

    const payload = {
      title,
      image_url: imageUrl,
      ingredients,
      steps,
      folder_id: state.currentFolderId
    };

    if (!supabaseClient) {
      const id = state.editingId || crypto.randomUUID();
      const item = { id, ...payload, created_at: new Date().toISOString() };
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
    await loadRecipesForFolder(state.currentFolderId);
    showView("folder-view");
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

      await deleteFromBucket(recipe.image_url, "recipe-images");
    }

    await loadRecipesForFolder(state.currentFolderId);
    showView("folder-view");
    toast("Receita excluída.");
  } catch (error) {
    console.error(error);
    toast("Erro ao excluir a receita.");
  }
}

/* ---------------- EVENTOS ---------------- */

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

  // Navegação
  $("back-home-from-folder-button").addEventListener("click", () => {
    state.currentFolderId = null;
    showView("home-view");
  });
  $("back-folder-from-editor-button").addEventListener("click", () => showView("folder-view"));
  $("cancel-editor-button").addEventListener("click", () => showView("folder-view"));
  $("back-folder-from-recipe-button").addEventListener("click", () => showView("folder-view"));

  // Pastas
  $("new-folder-button").addEventListener("click", startNewFolder);
  $("edit-folder-button").addEventListener("click", () => {
    if (state.currentFolderId) editFolder(state.currentFolderId);
  });
  $("delete-folder-button").addEventListener("click", () => {
    if (state.currentFolderId) deleteFolder(state.currentFolderId);
  });
  $("folder-form").addEventListener("submit", saveFolder);

  $("select-folder-image-button").addEventListener("click", () => $("folder-image").click());

  $("folder-image").addEventListener("change", () => {
    const file = $("folder-image").files[0];
    if (!file) return;

    $("folder-image-name").textContent = file.name;
    $("folder-image-preview").src = URL.createObjectURL(file);
    $("folder-image-preview-wrap").classList.remove("hidden");
  });

  $("remove-folder-image-button").addEventListener("click", () => {
    $("folder-image").value = "";
    state.editingFolderImageUrl = null;
    $("folder-image-preview").removeAttribute("src");
    $("folder-image-preview-wrap").classList.add("hidden");
    $("folder-image-name").textContent = "Nenhuma imagem selecionada";
  });

  // Receitas
  $("new-recipe-button").addEventListener("click", startNewRecipe);

  $("settings-button").addEventListener("click", () => {
    fillSettings();
    openModal("settings-modal");
  });

  $("logout-button").addEventListener("click", logout);

  $("select-image-button").addEventListener("click", () => $("recipe-image").click());

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

  // Personalização
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
  resetFolderEditor();
  await loadSettings();

  if (supabaseClient) {
    supabaseClient.auth.onAuthStateChange(() => {
      setTimeout(refreshAdminState, 0);
    });
  }

  await refreshAdminState();
  await loadFolders();

  if (!supabaseClient) {
    toast("Modo local: configure o Supabase para ativar a nuvem.");
  }
}

init();
