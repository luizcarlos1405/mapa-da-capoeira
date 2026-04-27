const ARQUIVO_DADOS = "dados.csv";
const CHAVE_CACHE = "mapacapoeira_geocode";
const ATRASO_GEOCODE_MS = 1100;

function parsearCSV(texto) {
  const linhas = texto
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((linha) => linha.trim());

  const cabecalho = separarCampos(linhas[0]);
  const colunaLat = cabecalho.findIndex(
    (c) => c.trim().toLowerCase() === "latitude",
  );
  const colunaLon = cabecalho.findIndex(
    (c) => c.trim().toLowerCase() === "longitude",
  );

  return linhas.slice(1).map((linha) => {
    const campos = separarCampos(linha);
    const registro = {};
    cabecalho.forEach((col, i) => {
      registro[col.trim()] = (campos[i] || "").trim();
    });
    if (colunaLat >= 0 && colunaLon >= 0) {
      registro["_lat"] = parseFloat(campos[colunaLat]);
      registro["_lon"] = parseFloat(campos[colunaLon]);
    }
    return registro;
  });
}

function separarCampos(linha) {
  const campos = [];
  let atual = "";
  let dentroAspas = false;

  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (c === '"') {
      if (dentroAspas && linha[i + 1] === '"') {
        atual += '"';
        i++;
      } else {
        dentroAspas = !dentroAspas;
      }
    } else if (c === "," && !dentroAspas) {
      campos.push(atual);
      atual = "";
    } else {
      atual += c;
    }
  }
  campos.push(atual);
  return campos;
}

function obterCache() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_CACHE) || "{}");
  } catch {
    return {};
  }
}

function salvarCache(cache) {
  localStorage.setItem(CHAVE_CACHE, JSON.stringify(cache));
}

async function geocodificar(endereco) {
  const cache = obterCache();
  if (cache[endereco]) return cache[endereco];

  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(endereco)}&format=json&countrycodes=br&limit=1`;

  const resposta = await fetch(url);
  const dados = await resposta.json();

  if (dados.length > 0) {
    const resultado = {
      lat: parseFloat(dados[0].lat),
      lon: parseFloat(dados[0].lon),
    };
    cache[endereco] = resultado;
    salvarCache(cache);
    return resultado;
  }

  return null;
}

function criarMapa() {
  const mapa = L.map("mapa").setView([-14.235, -51.925], 5);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18,
  }).addTo(mapa);

  return mapa;
}

function criarIcone() {
  return L.divIcon({
    className: "",
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 30 42">
      <path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 15 27 15 27s15-16.5 15-27C30 6.7 23.3 0 15 0z" fill="#2E7D32"/>
      <circle cx="15" cy="14" r="6" fill="#fff"/></svg>`,
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    popupAnchor: [0, -42],
  });
}

function conteudoPopup(ponto) {
  const horarios = ponto["Horários de Treino"]
    .split(";")
    .map((h) => h.trim())
    .filter((h) => h)
    .join("<br>");

  const plusCode = ponto["Plus Code"]
    ? `<p><strong>Plus Code:</strong> ${ponto["Plus Code"]}</p>`
    : "";

  return `<div class="popup-conteudo">
    <h3>${ponto["Grupo"]}</h3>
    <p><strong>Responsável:</strong> ${ponto["Nome do Responsável"]}</p>
    <p><strong>Telefone:</strong> ${ponto["Telefone de Contato"]}</p>
    <p><strong>Endereço:</strong> ${ponto["Endereço"]}</p>
    ${plusCode}
    <div class="horarios"><strong>Horários:</strong><br>${horarios}</div>
  </div>`;
}

function criarItemLista(ponto, mapa, marcador) {
  const item = document.createElement("div");
  item.className = "item-lista";

  item.innerHTML = `<div class="nome-grupo">${ponto["Grupo"]}</div>
    <div class="detalhes">${ponto["Nome do Responsável"]}</div>
    <div class="endereco">${ponto["Endereço"]}</div>`;

  item.onclick = () => {
    const latlng = marcador.getLatLng();
    mapa.setView(latlng, 16);
    marcador.openPopup();
    if (window.innerWidth <= 768) {
      document.getElementById("painel").classList.remove("aberto");
    }
  };

  return item;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function alternarPainel() {
  document.getElementById("painel").classList.toggle("aberto");
}

function extrairCoordenadas(ponto) {
  if (ponto["Coordenadas"]?.trim()) {
    const partes = ponto["Coordenadas"].split(",");
    if (partes.length >= 2) {
      const lat = parseFloat(partes[0].trim());
      const lon = parseFloat(partes[1].trim());
      if (!isNaN(lat) && !isNaN(lon)) {
        return { lat, lon };
      }
    }
  }

  if (!isNaN(ponto["_lat"]) && !isNaN(ponto["_lon"])) {
    return { lat: ponto["_lat"], lon: ponto["_lon"] };
  }

  return null;
}

function criarMarcador(ponto, coords, mapa, icone) {
  return L.marker([coords.lat, coords.lon], { icon: icone })
    .addTo(mapa)
    .bindPopup(conteudoPopup(ponto), { maxWidth: 300 });
}

function criarAvisoNaoEncontrado(ponto) {
  const aviso = document.createElement("div");
  aviso.className = "item-lista";
  aviso.innerHTML = `<div class="nome-grupo" style="color:#c62828">${ponto["Grupo"]}</div>
    <div class="detalhes" style="color:#c62828">Endereço não localizado</div>
    <div class="endereco">${ponto["Endereço"]}</div>`;
  return aviso;
}

async function inicializarMapa() {
  const mapa = criarMapa();
  const icone = criarIcone();
  const lista = document.getElementById("lista-locais");

  try {
    const resposta = await fetch(ARQUIVO_DADOS);
    if (!resposta.ok) {
      throw new Error("Arquivo não encontrado: " + ARQUIVO_DADOS);
    }

    const texto = await resposta.text();
    const pontos = parsearCSV(texto).filter(
      (p) => p["Mostrar no Mapa"]?.toUpperCase() === "TRUE",
    );

    const comCoords = [];
    const semCoords = [];

    for (const ponto of pontos) {
      const coords = extrairCoordenadas(ponto);
      if (coords) {
        comCoords.push({ ponto, coords });
      } else {
        semCoords.push(ponto);
      }
    }

    const marcadores = [];

    for (const { ponto, coords } of comCoords) {
      const marcador = criarMarcador(ponto, coords, mapa, icone);
      marcadores.push(marcador);
      lista.appendChild(criarItemLista(ponto, mapa, marcador));
    }

    if (marcadores.length > 0) {
      mapa.fitBounds(L.featureGroup(marcadores).getBounds().pad(0.2));
    }

    for (const [i, ponto] of semCoords.entries()) {
      let coords = null;

      if (ponto["Plus Code"]?.trim()) {
        coords = await geocodificar(ponto["Plus Code"].trim());
      }

      if (!coords) {
        coords = await geocodificar(ponto["Endereço"]);
      }

      if (coords) {
        const marcador = criarMarcador(ponto, coords, mapa, icone);
        marcadores.push(marcador);
        lista.appendChild(criarItemLista(ponto, mapa, marcador));

        if (marcadores.length === 1) {
          mapa.fitBounds(L.featureGroup(marcadores).getBounds().pad(0.2));
        }
      } else {
        console.warn(`Endereço não encontrado: "${ponto["Endereço"]}"`);
        lista.appendChild(criarAvisoNaoEncontrado(ponto));
      }

      if (i < semCoords.length - 1) {
        await sleep(ATRASO_GEOCODE_MS);
      }
    }

    const rodape = document.createElement("div");
    rodape.className = "rodape-painel";
    rodape.textContent = `${comCoords.length + semCoords.length} local(is) encontrado(s)`;
    lista.appendChild(rodape);
  } catch (erro) {
    console.error("Erro:", erro);
    lista.innerHTML = `<div class="item-lista"><div class="detalhes" style="color:#c62828">
      Erro ao carregar dados. Verifique se o servidor está rodando e o arquivo ${ARQUIVO_DADOS} existe.</div></div>`;
  }
}

inicializarMapa();
