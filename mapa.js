const ARQUIVO_DADOS =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vR2xX46FA_q9DwtlohUBk-q5a38E2piArGO7--eNuza1J-EvXOrZxDn8wDwj1Ciw8DRch-M2xc3OeIz/pub?gid=1007254703&single=true&output=csv";
const CHAVE_CACHE = "mapacapoeira_geocode";
const ATRASO_GEOCODE_MS = 1100;

const CORES_GRUPO = ["#002776"];

const ICONE = {
  USUARIO:
    '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  LOCALIZACAO:
    '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  TELEFONE:
    '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>',
  CALENDARIO:
    '<rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>',
  INSTAGRAM:
    '<rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>',
  WHATSAPP: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
};

const COLUNAS = {
  MOSTRAR: "Mostrar no Mapa",
  NOME_ENDERECO: "Nome do Endereço",
  ENDERECO: "Endereço",
  PLUS_CODE: "Plus Code",
  COORDENADAS: "Coordenadas",
  RESPONSAVEL: "Nome do Responsável",
  TELEFONE: "Telefone de Contato",
  GRUPO: "Grupo",
  HORARIOS: "Horários de Treino",
  INSTAGRAM: "Instagram",
  LATITUDE: "Latitude",
  LONGITUDE: "Longitude",
};

const todosLocais = [];
let mapaGlobal = null;
let textoBusca = "";
let campoFiltro = "todos";

function iconeSVG(dados, tam) {
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="' +
    tam +
    '" height="' +
    tam +
    '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    dados +
    "</svg>"
  );
}

function iconeUsuario(tam) {
  return iconeSVG(ICONE.USUARIO, tam);
}

function iconeLocalizacao(tam) {
  return iconeSVG(ICONE.LOCALIZACAO, tam);
}

function iconeTelefone(tam) {
  return iconeSVG(ICONE.TELEFONE, tam);
}

function iconeCalendario(tam) {
  return iconeSVG(ICONE.CALENDARIO, tam);
}

function iconeInstagram(tam) {
  return iconeSVG(ICONE.INSTAGRAM, tam);
}

function iconeWhatsApp(tam) {
  return iconeSVG(ICONE.WHATSAPP, tam);
}

function botoesAcao(ponto, contexto) {
  const botoes = [];
  const tel = ponto[COLUNAS.TELEFONE];

  if (tel && tel.replace(/\D/g, "").length >= 8) {
    let telNumeros = tel.replace(/\D/g, "");
    if (!telNumeros.startsWith("55")) telNumeros = "55" + telNumeros;
    botoes.push({
      icone: iconeTelefone(14),
      rotulo: "Ligar",
      link: "tel:+" + telNumeros,
    });
  }

  const endereco = ponto[COLUNAS.NOME_ENDERECO] || ponto[COLUNAS.ENDERECO];
  if (endereco && endereco.trim()) {
    botoes.push({
      icone: iconeLocalizacao(14),
      rotulo: "Como chegar",
      link: linkGoogleMaps(endereco),
    });
  }

  const handleIg = extrairHandleInstagram(ponto[COLUNAS.INSTAGRAM]);
  if (handleIg) {
    botoes.push({
      icone: iconeInstagram(14),
      rotulo: "Instagram",
      link: ponto[COLUNAS.INSTAGRAM],
    });
  }

  const linkZap = linkWhatsApp(tel);
  if (linkZap) {
    botoes.push({
      icone: iconeWhatsApp(14),
      rotulo: "Whatsapp",
      link: linkZap,
    });
  }

  if (botoes.length === 0) return "";

  const stopProp =
    contexto !== "popup" ? ' onclick="event.stopPropagation()"' : "";

  let html = '<div class="botoes-acao-separador"></div>';
  html += '<div class="botoes-acao">';
  botoes.forEach(function (btn) {
    html +=
      '<a class="botao-acao" href="' +
      btn.link +
      '" target="_blank" rel="noopener"' +
      stopProp +
      ">" +
      btn.icone +
      "<span>" +
      btn.rotulo +
      "</span></a>";
  });
  html += "</div>";
  return html;
}

function extrairHandleInstagram(url) {
  if (!url || !url.trim()) return null;
  const match = url.match(/instagram\.com\/([^/?\s]+)/);
  if (match && match[1]) return "@" + match[1];
  return null;
}

function linkWhatsApp(telefone) {
  if (!telefone) return null;
  let numeros = telefone.replace(/\D/g, "");
  if (numeros.length < 10) return null;
  if (!numeros.startsWith("55")) numeros = "55" + numeros;
  return "https://wa.me/" + numeros;
}

function linkGoogleMaps(nome) {
  if (!nome) return null;
  return (
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent(nome)
  );
}

function corDoGrupo() {
  return CORES_GRUPO[0];
}

function embaralhar(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function parsearCSV(texto) {
  const linhas = texto
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter(function (linha) {
      return linha.trim();
    });

  const cabecalho = separarCampos(linhas[0]);
  const colunaLat = cabecalho.findIndex(function (c) {
    return c.trim().toLowerCase() === COLUNAS.LATITUDE.toLowerCase();
  });
  const colunaLon = cabecalho.findIndex(function (c) {
    return c.trim().toLowerCase() === COLUNAS.LONGITUDE.toLowerCase();
  });

  return linhas.slice(1).map(function (linha) {
    const campos = separarCampos(linha);
    const registro = {};
    cabecalho.forEach(function (col, i) {
      registro[col.trim()] = (campos[i] || "").trim();
    });
    if (colunaLat >= 0 && colunaLon >= 0) {
      registro._lat = parseFloat(campos[colunaLat]);
      registro._lon = parseFloat(campos[colunaLon]);
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

  const url =
    "https://nominatim.openstreetmap.org/search?q=" +
    encodeURIComponent(endereco) +
    "&format=json&countrycodes=br&limit=1";

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
  const mapa = L.map("mapa", { zoomControl: false }).setView(
    [-14.235, -51.925],
    5,
  );
  L.control.zoom({ position: "topright" }).addTo(mapa);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 18,
  }).addTo(mapa);

  return mapa;
}

function criarIcone() {
  return L.divIcon({
    className: "marcador-personalizado",
    html: '<img src="pino-mapa.svg" style="width:40px;height:40px;" />',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -44],
  });
}

function conteudoPopup(ponto) {
  let html =
    '<div class="popup-cabecalho"><h3>' + ponto[COLUNAS.GRUPO] + "</h3></div>";
  html += '<div class="popup-corpo">';

  html +=
    '<div class="popup-linha">' +
    iconeUsuario(14) +
    '<span class="texto-nome">' +
    ponto[COLUNAS.RESPONSAVEL] +
    "</span></div>";

  const partesEndereco = [];
  if (ponto[COLUNAS.NOME_ENDERECO] && ponto[COLUNAS.NOME_ENDERECO].trim())
    partesEndereco.push(
      "<strong>" + ponto[COLUNAS.NOME_ENDERECO] + "</strong>",
    );
  if (ponto[COLUNAS.ENDERECO] && ponto[COLUNAS.ENDERECO].trim())
    partesEndereco.push(ponto[COLUNAS.ENDERECO]);
  const textoEndereco = partesEndereco.join("<br>");
  html +=
    '<div class="popup-linha">' +
    iconeLocalizacao(14) +
    '<span class="texto-endereco">' +
    textoEndereco +
    "</span></div>";

  if (ponto[COLUNAS.TELEFONE]) {
    html +=
      '<div class="popup-linha">' +
      iconeTelefone(14) +
      '<span class="texto-telefone">' +
      ponto[COLUNAS.TELEFONE] +
      "</span></div>";
  }

  const handleIg = extrairHandleInstagram(ponto[COLUNAS.INSTAGRAM]);
  if (handleIg) {
    html +=
      '<div class="popup-linha">' +
      iconeInstagram(14) +
      '<span class="texto-instagram">' +
      handleIg +
      "</span></div>";
  }

  if (ponto[COLUNAS.HORARIOS]) {
    const horarios = ponto[COLUNAS.HORARIOS]
      .split(";")
      .map(function (h) {
        return h.trim();
      })
      .filter(function (h) {
        return h;
      })
      .join("<br>");
    if (horarios) {
      html +=
        '<div class="popup-horario">' +
        iconeCalendario(13) +
        "<span>" +
        horarios +
        "</span></div>";
    }
  }

  html += botoesAcao(ponto, "popup");

  html += "</div>";
  html +=
    '<div class="popup-faixa"><span></span><span></span><span></span></div>';

  return html;
}

function criarCartao(ponto, marcador, cor) {
  const cartao = document.createElement("div");
  cartao.className = "cartao";

  let html =
    '<div class="cartao-cabecalho">' +
    '<div class="cartao-ponto" style="background:' +
    cor +
    '"></div>' +
    '<span class="cartao-grupo" style="color:' +
    cor +
    '">' +
    ponto[COLUNAS.GRUPO] +
    "</span></div>";

  html +=
    '<div class="cartao-detalhe">' +
    iconeUsuario(14) +
    '<span class="texto-responsavel">' +
    ponto[COLUNAS.RESPONSAVEL] +
    "</span></div>";

  const partesEndereco = [];
  if (ponto[COLUNAS.NOME_ENDERECO] && ponto[COLUNAS.NOME_ENDERECO].trim())
    partesEndereco.push(
      "<strong>" + ponto[COLUNAS.NOME_ENDERECO] + "</strong>",
    );
  if (ponto[COLUNAS.ENDERECO] && ponto[COLUNAS.ENDERECO].trim())
    partesEndereco.push(ponto[COLUNAS.ENDERECO]);
  const textoEndereco = partesEndereco.join("<br>");
  html +=
    '<div class="cartao-detalhe">' +
    iconeLocalizacao(14) +
    '<span class="texto-endereco">' +
    textoEndereco +
    "</span></div>";

  if (ponto[COLUNAS.TELEFONE]) {
    html +=
      '<div class="cartao-detalhe">' +
      iconeTelefone(14) +
      '<span class="texto-telefone">' +
      ponto[COLUNAS.TELEFONE] +
      "</span></div>";
  }

  const handleIg = extrairHandleInstagram(ponto[COLUNAS.INSTAGRAM]);
  if (handleIg) {
    html +=
      '<div class="cartao-detalhe">' +
      iconeInstagram(14) +
      '<span class="texto-instagram">' +
      handleIg +
      "</span></div>";
  }

  if (ponto[COLUNAS.HORARIOS]) {
    const horarios = ponto[COLUNAS.HORARIOS]
      .split(";")
      .map(function (h) {
        return h.trim();
      })
      .filter(function (h) {
        return h;
      })
      .join("<br>");
    if (horarios) {
      html +=
        '<div class="cartao-horario">' +
        iconeCalendario(13) +
        "<span>" +
        horarios +
        "</span></div>";
    }
  }

  html += botoesAcao(ponto, "cartao");

  cartao.innerHTML = html;

  cartao.onclick = function () {
    const latlng = marcador.getLatLng();
    mapaGlobal.setView(latlng, 16);
    marcador.openPopup();
    if (window.innerWidth <= 768) {
      fecharPainel();
    }
  };

  return cartao;
}

function criarAvisoNaoEncontrado(ponto) {
  const cartao = document.createElement("div");
  cartao.className = "cartao";
  cartao.innerHTML =
    '<div class="cartao-cabecalho">' +
    '<div class="cartao-ponto" style="background:#c62828"></div>' +
    '<span class="cartao-grupo" style="color:#c62828">' +
    ponto[COLUNAS.GRUPO] +
    "</span></div>" +
    '<div class="cartao-detalhe">' +
    '<span class="texto-endereco" style="color:#c62828">Endereço não localizado</span></div>' +
    '<div class="cartao-detalhe">' +
    iconeLocalizacao(14) +
    '<span class="texto-endereco">' +
    (function () {
      const p = [];
      if (ponto[COLUNAS.NOME_ENDERECO] && ponto[COLUNAS.NOME_ENDERECO].trim())
        p.push("<strong>" + ponto[COLUNAS.NOME_ENDERECO] + "</strong>");
      if (ponto[COLUNAS.ENDERECO] && ponto[COLUNAS.ENDERECO].trim())
        p.push(ponto[COLUNAS.ENDERECO]);
      return p.join("<br>");
    })() +
    "</span></div>";
  return cartao;
}

function combinarFiltro(ponto) {
  if (!textoBusca) return true;
  const texto = textoBusca.toLowerCase();

  switch (campoFiltro) {
    case "nome":
      return (
        (ponto[COLUNAS.NOME_ENDERECO] || "").toLowerCase().indexOf(texto) >=
          0 || (ponto[COLUNAS.ENDERECO] || "").toLowerCase().indexOf(texto) >= 0
      );
    case "grupo":
      return (ponto[COLUNAS.GRUPO] || "").toLowerCase().indexOf(texto) >= 0;
    case "responsavel":
      return (
        (ponto[COLUNAS.RESPONSAVEL] || "").toLowerCase().indexOf(texto) >= 0
      );
    default:
      return (
        (ponto[COLUNAS.GRUPO] || "").toLowerCase().indexOf(texto) >= 0 ||
        (ponto[COLUNAS.RESPONSAVEL] || "").toLowerCase().indexOf(texto) >= 0 ||
        (ponto[COLUNAS.ENDERECO] || "").toLowerCase().indexOf(texto) >= 0 ||
        (ponto[COLUNAS.TELEFONE] || "").toLowerCase().indexOf(texto) >= 0 ||
        (ponto[COLUNAS.INSTAGRAM] || "").toLowerCase().indexOf(texto) >= 0
      );
  }
}

function renderizarLista() {
  const lista = document.getElementById("lista-locais");
  const contagem = document.getElementById("contagem-resultados");
  const contagemMovel = document.getElementById("contagem-movel");

  lista.innerHTML = "";
  lista.appendChild(contagem);

  embaralhar(todosLocais);
  const filtrados = todosLocais.filter(function (item) {
    return combinarFiltro(item.ponto);
  });

  contagem.textContent = filtrados.length + " local(is) encontrado(s)";
  if (contagemMovel) contagemMovel.textContent = filtrados.length;

  filtrados.forEach(function (item) {
    lista.appendChild(criarCartao(item.ponto, item.marcador, item.cor));
  });
}

function filtrarLocais() {
  textoBusca = document.getElementById("entrada-busca").value;
  const entradaMovel = document.getElementById("entrada-busca-movel");
  if (entradaMovel) entradaMovel.value = textoBusca;
  renderizarLista();
}

function filtrarLocaisMovel() {
  textoBusca = document.getElementById("entrada-busca-movel").value;
  document.getElementById("entrada-busca").value = textoBusca;
  renderizarLista();
}

function definirFiltro(botao, campo) {
  campoFiltro = campo;
  const abas = botao.parentElement.querySelectorAll(".aba");
  abas.forEach(function (a) {
    a.classList.remove("ativa");
  });
  botao.classList.add("ativa");
  renderizarLista();
}

function abrirPainel() {
  document.getElementById("painel").classList.remove("fechado");
}

function fecharPainel() {
  document.getElementById("painel").classList.add("fechado");
}

function extrairCoordenadas(ponto) {
  if (ponto[COLUNAS.COORDENADAS] && ponto[COLUNAS.COORDENADAS].trim()) {
    const partes = ponto[COLUNAS.COORDENADAS].split(",");
    if (partes.length >= 2) {
      const lat = parseFloat(partes[0].trim());
      const lon = parseFloat(partes[1].trim());
      if (!isNaN(lat) && !isNaN(lon)) {
        return { lat: lat, lon: lon };
      }
    }
  }

  if (!isNaN(ponto._lat) && !isNaN(ponto._lon)) {
    return { lat: ponto._lat, lon: ponto._lon };
  }

  return null;
}

function criarMarcador(ponto, coords, mapa, icone) {
  return L.marker([coords.lat, coords.lon], { icon: icone })
    .addTo(mapa)
    .bindPopup(conteudoPopup(ponto), { maxWidth: 300 });
}

function sleep(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

async function inicializarMapa() {
  mapaGlobal = criarMapa();
  const lista = document.getElementById("lista-locais");
  const carregando = document.getElementById("carregando");

  try {
    const resposta = await fetch(ARQUIVO_DADOS);
    if (!resposta.ok) {
      throw new Error("Arquivo não encontrado: " + ARQUIVO_DADOS);
    }

    const texto = await resposta.text();
    const pontos = parsearCSV(texto).filter(function (p) {
      return p[COLUNAS.MOSTRAR] && p[COLUNAS.MOSTRAR].toUpperCase() === "TRUE";
    });

    const comCoords = [];
    const semCoords = [];

    for (let i = 0; i < pontos.length; i++) {
      const ponto = pontos[i];
      const coords = extrairCoordenadas(ponto);
      if (coords) {
        comCoords.push({ ponto: ponto, coords: coords });
      } else {
        semCoords.push(ponto);
      }
    }

    const marcadores = [];

    for (let j = 0; j < comCoords.length; j++) {
      const item = comCoords[j];
      const cor = corDoGrupo(item.ponto[COLUNAS.GRUPO]);
      const icone = criarIcone();
      const marcador = criarMarcador(
        item.ponto,
        item.coords,
        mapaGlobal,
        icone,
      );
      marcadores.push(marcador);
      todosLocais.push({
        ponto: item.ponto,
        marcador: marcador,
        cor: cor,
      });
    }

    renderizarLista();

    if (marcadores.length > 0) {
      mapaGlobal.fitBounds(L.featureGroup(marcadores).getBounds().pad(0.2));
    }

    if (carregando) carregando.classList.add("escondido");

    for (let k = 0; k < semCoords.length; k++) {
      const pontoSem = semCoords[k];
      let coordsSem = null;

      if (pontoSem[COLUNAS.PLUS_CODE] && pontoSem[COLUNAS.PLUS_CODE].trim()) {
        coordsSem = await geocodificar(pontoSem[COLUNAS.PLUS_CODE].trim());
      }

      if (!coordsSem) {
        coordsSem = await geocodificar(pontoSem[COLUNAS.ENDERECO]);
      }

      if (coordsSem) {
        const corSem = corDoGrupo(pontoSem[COLUNAS.GRUPO]);
        const iconeSem = criarIcone();
        const marcadorSem = criarMarcador(
          pontoSem,
          coordsSem,
          mapaGlobal,
          iconeSem,
        );
        marcadores.push(marcadorSem);
        todosLocais.push({
          ponto: pontoSem,
          marcador: marcadorSem,
          cor: corSem,
        });

        if (marcadores.length === 1) {
          mapaGlobal.fitBounds(L.featureGroup(marcadores).getBounds().pad(0.2));
        }
      } else {
        console.warn(
          'Endereço não encontrado: "' + pontoSem[COLUNAS.ENDERECO] + '"',
        );
        todosLocais.push({
          ponto: pontoSem,
          marcador: null,
          cor: "#c62828",
        });
      }

      renderizarLista();

      if (k < semCoords.length - 1) {
        await sleep(ATRASO_GEOCODE_MS);
      }
    }

    renderizarLista();
  } catch (erro) {
    console.error("Erro:", erro);
    if (carregando) carregando.classList.add("escondido");
    lista.innerHTML =
      '<div class="cartao"><div class="cartao-detalhe">' +
      '<span class="texto-endereco" style="color:#c62828">' +
      "Erro ao carregar dados. Verifique se o servidor está rodando e o arquivo " +
      ARQUIVO_DADOS +
      " existe.</span></div></div>";
  }
}

document.getElementById("busca-movel").addEventListener("click", function (e) {
  e.stopPropagation();
  abrirPainel();
});
document.getElementById("area-mapa").addEventListener("click", fecharPainel);

inicializarMapa();
