var ARQUIVO_DADOS = "dados.csv";
var CHAVE_CACHE = "mapacapoeira_geocode";
var ATRASO_GEOCODE_MS = 1100;

var CORES_GRUPO = ["#002776"];

var todosLocais = [];
var mapaGlobal = null;
var textoBusca = "";
var campoFiltro = "todos";

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
  return iconeSVG(
    '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    tam,
  );
}

function iconeLocalizacao(tam) {
  return iconeSVG(
    '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    tam,
  );
}

function iconeTelefone(tam) {
  return iconeSVG(
    '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>',
    tam,
  );
}

function iconeCalendario(tam) {
  return iconeSVG(
    '<rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>',
    tam,
  );
}

function corDoGrupo() {
  return CORES_GRUPO[0];
}

function parsearCSV(texto) {
  var linhas = texto
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter(function (linha) {
      return linha.trim();
    });

  var cabecalho = separarCampos(linhas[0]);
  var colunaLat = cabecalho.findIndex(function (c) {
    return c.trim().toLowerCase() === "latitude";
  });
  var colunaLon = cabecalho.findIndex(function (c) {
    return c.trim().toLowerCase() === "longitude";
  });

  return linhas.slice(1).map(function (linha) {
    var campos = separarCampos(linha);
    var registro = {};
    cabecalho.forEach(function (col, i) {
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
  var campos = [];
  var atual = "";
  var dentroAspas = false;

  for (var i = 0; i < linha.length; i++) {
    var c = linha[i];
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
  var cache = obterCache();
  if (cache[endereco]) return cache[endereco];

  var url =
    "https://nominatim.openstreetmap.org/search?q=" +
    encodeURIComponent(endereco) +
    "&format=json&countrycodes=br&limit=1";

  var resposta = await fetch(url);
  var dados = await resposta.json();

  if (dados.length > 0) {
    var resultado = {
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
  var mapa = L.map("mapa", { zoomControl: false }).setView(
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
    html: '<img src="cabaca.svg" style="width:40px;height:40px;" />',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -24],
  });
}

function conteudoPopup(ponto) {
  var html =
    '<div class="popup-cabecalho"><h3>' + ponto["Grupo"] + "</h3></div>";
  html += '<div class="popup-corpo">';

  html +=
    '<div class="popup-linha">' +
    iconeUsuario(14) +
    '<span class="texto-nome">' +
    ponto["Nome do Responsável"] +
    "</span></div>";

  html +=
    '<div class="popup-linha">' +
    iconeLocalizacao(14) +
    '<span class="texto-endereco">' +
    ponto["Endereço"] +
    "</span></div>";

  if (ponto["Telefone de Contato"]) {
    html +=
      '<div class="popup-linha">' +
      iconeTelefone(14) +
      '<span class="texto-telefone">' +
      ponto["Telefone de Contato"] +
      "</span></div>";
  }

  if (ponto["Horários de Treino"]) {
    var horarios = ponto["Horários de Treino"]
      .split(";")
      .map(function (h) {
        return h.trim();
      })
      .filter(function (h) {
        return h;
      })
      .join("<br>");
    if (horarios) {
      html += '<div class="popup-horario">' + horarios + "</div>";
    }
  }

  html += "</div>";
  html +=
    '<div class="popup-faixa"><span></span><span></span><span></span></div>';

  return html;
}

function criarCartao(ponto, marcador, cor) {
  var cartao = document.createElement("div");
  cartao.className = "cartao";

  var html =
    '<div class="cartao-cabecalho">' +
    '<div class="cartao-ponto" style="background:' +
    cor +
    '"></div>' +
    '<span class="cartao-grupo" style="color:' +
    cor +
    '">' +
    ponto["Grupo"] +
    "</span></div>";

  html +=
    '<div class="cartao-detalhe">' +
    iconeUsuario(14) +
    '<span class="texto-responsavel">' +
    ponto["Nome do Responsável"] +
    "</span></div>";

  html +=
    '<div class="cartao-detalhe">' +
    iconeLocalizacao(14) +
    '<span class="texto-endereco">' +
    ponto["Endereço"] +
    "</span></div>";

  if (ponto["Telefone de Contato"]) {
    html +=
      '<div class="cartao-detalhe">' +
      iconeTelefone(14) +
      '<span class="texto-telefone">' +
      ponto["Telefone de Contato"] +
      "</span></div>";
  }

  if (ponto["Horários de Treino"]) {
    var horarios = ponto["Horários de Treino"]
      .split(";")
      .map(function (h) {
        return h.trim();
      })
      .filter(function (h) {
        return h;
      })
      .join(" · ");
    if (horarios) {
      html +=
        '<div class="cartao-horario">' +
        iconeCalendario(13) +
        "<span>" +
        horarios +
        "</span></div>";
    }
  }

  cartao.innerHTML = html;

  cartao.onclick = function () {
    var latlng = marcador.getLatLng();
    mapaGlobal.setView(latlng, 16);
    marcador.openPopup();
    if (window.innerWidth <= 768) {
      document.getElementById("painel").classList.add("fechado");
    }
  };

  return cartao;
}

function criarAvisoNaoEncontrado(ponto) {
  var cartao = document.createElement("div");
  cartao.className = "cartao";
  cartao.innerHTML =
    '<div class="cartao-cabecalho">' +
    '<div class="cartao-ponto" style="background:#c62828"></div>' +
    '<span class="cartao-grupo" style="color:#c62828">' +
    ponto["Grupo"] +
    "</span></div>" +
    '<div class="cartao-detalhe">' +
    '<span class="texto-endereco" style="color:#c62828">Endereço não localizado</span></div>' +
    '<div class="cartao-detalhe">' +
    iconeLocalizacao(14) +
    '<span class="texto-endereco">' +
    ponto["Endereço"] +
    "</span></div>";
  return cartao;
}

function combinarFiltro(ponto) {
  if (!textoBusca) return true;
  var texto = textoBusca.toLowerCase();

  switch (campoFiltro) {
    case "nome":
      return (
        (ponto["Nome do Endereço"] || "").toLowerCase().indexOf(texto) >= 0 ||
        (ponto["Endereço"] || "").toLowerCase().indexOf(texto) >= 0
      );
    case "grupo":
      return (ponto["Grupo"] || "").toLowerCase().indexOf(texto) >= 0;
    case "responsavel":
      return (
        (ponto["Nome do Responsável"] || "").toLowerCase().indexOf(texto) >= 0
      );
    default:
      return (
        (ponto["Grupo"] || "").toLowerCase().indexOf(texto) >= 0 ||
        (ponto["Nome do Responsável"] || "").toLowerCase().indexOf(texto) >=
          0 ||
        (ponto["Endereço"] || "").toLowerCase().indexOf(texto) >= 0 ||
        (ponto["Telefone de Contato"] || "").toLowerCase().indexOf(texto) >= 0
      );
  }
}

function renderizarLista() {
  var lista = document.getElementById("lista-locais");
  var contagem = document.getElementById("contagem-resultados");
  var contagemMovel = document.getElementById("contagem-movel");

  lista.innerHTML = "";
  lista.appendChild(contagem);

  var filtrados = todosLocais.filter(function (item) {
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
  var entradaMovel = document.getElementById("entrada-busca-movel");
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
  var abas = botao.parentElement.querySelectorAll(".aba");
  abas.forEach(function (a) {
    a.classList.remove("ativa");
  });
  botao.classList.add("ativa");
  renderizarLista();
}

function alternarPainel() {
  document.getElementById("painel").classList.toggle("fechado");
}

function extrairCoordenadas(ponto) {
  if (ponto["Coordenadas"] && ponto["Coordenadas"].trim()) {
    var partes = ponto["Coordenadas"].split(",");
    if (partes.length >= 2) {
      var lat = parseFloat(partes[0].trim());
      var lon = parseFloat(partes[1].trim());
      if (!isNaN(lat) && !isNaN(lon)) {
        return { lat: lat, lon: lon };
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

function sleep(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

async function inicializarMapa() {
  mapaGlobal = criarMapa();
  var lista = document.getElementById("lista-locais");
  var carregando = document.getElementById("carregando");

  try {
    var resposta = await fetch(ARQUIVO_DADOS);
    if (!resposta.ok) {
      throw new Error("Arquivo não encontrado: " + ARQUIVO_DADOS);
    }

    var texto = await resposta.text();
    var pontos = parsearCSV(texto).filter(function (p) {
      return (
        p["Mostrar no Mapa"] && p["Mostrar no Mapa"].toUpperCase() === "TRUE"
      );
    });

    var comCoords = [];
    var semCoords = [];

    for (var i = 0; i < pontos.length; i++) {
      var ponto = pontos[i];
      var coords = extrairCoordenadas(ponto);
      if (coords) {
        comCoords.push({ ponto: ponto, coords: coords });
      } else {
        semCoords.push(ponto);
      }
    }

    var marcadores = [];

    for (var j = 0; j < comCoords.length; j++) {
      var item = comCoords[j];
      var cor = corDoGrupo(item.ponto["Grupo"]);
      var icone = criarIcone();
      var marcador = criarMarcador(item.ponto, item.coords, mapaGlobal, icone);
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

    for (var k = 0; k < semCoords.length; k++) {
      var pontoSem = semCoords[k];
      var coordsSem = null;

      if (pontoSem["Plus Code"] && pontoSem["Plus Code"].trim()) {
        coordsSem = await geocodificar(pontoSem["Plus Code"].trim());
      }

      if (!coordsSem) {
        coordsSem = await geocodificar(pontoSem["Endereço"]);
      }

      if (coordsSem) {
        var corSem = corDoGrupo(pontoSem["Grupo"]);
        var iconeSem = criarIcone();
        var marcadorSem = criarMarcador(
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
        console.warn('Endereço não encontrado: "' + pontoSem["Endereço"] + '"');
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

inicializarMapa();
