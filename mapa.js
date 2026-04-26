const ARQUIVO_DADOS = 'dados.csv';
const CHAVE_CACHE = 'mapacapoeira_geocode';
const ATRASO_GEOCODE_MS = 1100;

function parsearCSV(texto) {
    const linhas = texto
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n')
        .filter(linha => linha.trim());

    const cabecalho = separarCampos(linhas[0]);
    const colunaLat = cabecalho.findIndex(c => c.trim().toLowerCase() === 'latitude');
    const colunaLon = cabecalho.findIndex(c => c.trim().toLowerCase() === 'longitude');

    return linhas.slice(1).map(linha => {
        const campos = separarCampos(linha);
        const registro = {};
        cabecalho.forEach((col, i) => {
            registro[col.trim()] = (campos[i] || '').trim();
        });
        if (colunaLat >= 0 && colunaLon >= 0) {
            registro['_lat'] = parseFloat(campos[colunaLat]);
            registro['_lon'] = parseFloat(campos[colunaLon]);
        }
        return registro;
    });
}

function separarCampos(linha) {
    const campos = [];
    let atual = '';
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
        } else if (c === ',' && !dentroAspas) {
            campos.push(atual);
            atual = '';
        } else {
            atual += c;
        }
    }
    campos.push(atual);
    return campos;
}

function obterCache() {
    try {
        return JSON.parse(localStorage.getItem(CHAVE_CACHE) || '{}');
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
            lon: parseFloat(dados[0].lon)
        };
        cache[endereco] = resultado;
        salvarCache(cache);
        return resultado;
    }

    return null;
}

function criarMapa() {
    const mapa = L.map('mapa').setView([-14.235, -51.925], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18
    }).addTo(mapa);

    return mapa;
}

function criarIcone() {
    return L.divIcon({
        className: '',
        html: '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 30 42">' +
              '<path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 15 27 15 27s15-16.5 15-27C30 6.7 23.3 0 15 0z" fill="#2E7D32"/>' +
              '<circle cx="15" cy="14" r="6" fill="#fff"/></svg>',
        iconSize: [30, 42],
        iconAnchor: [15, 42],
        popupAnchor: [0, -42]
    });
}

function conteudoPopup(ponto) {
    const horarios = ponto['Horários de Treino']
        .split(';')
        .map(h => h.trim())
        .filter(h => h)
        .join('<br>');

    return '<div class="popup-conteudo">' +
        '<h3>' + ponto['Grupo'] +
        ' <span class="tag-estilo">' + ponto['Estilo'] + '</span></h3>' +
        '<p><strong>Responsável:</strong> ' + ponto['Nome do Responsável'] + '</p>' +
        '<p><strong>Telefone:</strong> ' + ponto['Telefone de Contato'] + '</p>' +
        '<p><strong>Endereço:</strong> ' + ponto['Endereço'] + '</p>' +
        '<div class="horarios"><strong>Horários:</strong><br>' + horarios + '</div>' +
        '</div>';
}

function criarItemLista(ponto, mapa, marcador) {
    const item = document.createElement('div');
    item.className = 'item-lista';

    item.innerHTML =
        '<div class="nome-grupo">' + ponto['Grupo'] + '</div>' +
        '<div class="detalhes">' + ponto['Estilo'] + ' — ' + ponto['Nome do Responsável'] + '</div>' +
        '<div class="endereco">' + ponto['Endereço'] + '</div>';

    item.onclick = function () {
        var latlng = marcador.getLatLng();
        mapa.setView(latlng, 16);
        marcador.openPopup();
        if (window.innerWidth <= 768) {
            document.getElementById('painel').classList.remove('aberto');
        }
    };

    return item;
}

function sleep(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

function alternarPainel() {
    document.getElementById('painel').classList.toggle('aberto');
}

async function principal() {
    var mapa = criarMapa();
    var icone = criarIcone();
    var carregando = document.getElementById('carregando');
    var lista = document.getElementById('lista-locais');

    try {
        var resposta = await fetch(ARQUIVO_DADOS);
        if (!resposta.ok) throw new Error('Arquivo não encontrado: ' + ARQUIVO_DADOS);

        var texto = await resposta.text();
        var pontos = parsearCSV(texto);
        var marcadores = [];

        for (var i = 0; i < pontos.length; i++) {
            var ponto = pontos[i];
            var coords = null;

            if (ponto['Coordenadas'] && ponto['Coordenadas'].trim()) {
                var partes = ponto['Coordenadas'].split(',');
                if (partes.length >= 2) {
                    var latCoord = parseFloat(partes[0].trim());
                    var lonCoord = parseFloat(partes[1].trim());
                    if (!isNaN(latCoord) && !isNaN(lonCoord)) {
                        coords = { lat: latCoord, lon: lonCoord };
                    }
                }
            }

            if (!coords && !isNaN(ponto['_lat']) && !isNaN(ponto['_lon'])) {
                coords = { lat: ponto['_lat'], lon: ponto['_lon'] };
            }

            if (!coords) {
                coords = await geocodificar(ponto['Endereço']);
            }

            if (coords) {
                var marcador = L.marker([coords.lat, coords.lon], { icon: icone })
                    .addTo(mapa)
                    .bindPopup(conteudoPopup(ponto), { maxWidth: 300 });

                marcadores.push(marcador);
                lista.appendChild(criarItemLista(ponto, mapa, marcador));
            } else {
                console.warn('Endereço não encontrado: "' + ponto['Endereço'] + '"');

                var aviso = document.createElement('div');
                aviso.className = 'item-lista';
                aviso.innerHTML =
                    '<div class="nome-grupo" style="color:#c62828">' + ponto['Grupo'] + '</div>' +
                    '<div class="detalhes" style="color:#c62828">Endereço não localizado</div>' +
                    '<div class="endereco">' + ponto['Endereço'] + '</div>';
                lista.appendChild(aviso);
            }

            if (i < pontos.length - 1) {
                await sleep(ATRASO_GEOCODE_MS);
            }
        }

        if (marcadores.length > 0) {
            mapa.fitBounds(L.featureGroup(marcadores).getBounds().pad(0.2));
        }

        var rodape = document.createElement('div');
        rodape.className = 'rodape-painel';
        rodape.textContent = pontos.length + ' local(is) encontrado(s)';
        lista.appendChild(rodape);

    } catch (erro) {
        console.error('Erro:', erro);
        lista.innerHTML = '<div class="item-lista"><div class="detalhes" style="color:#c62828">' +
            'Erro ao carregar dados. Verifique se o servidor está rodando e o arquivo ' +
            ARQUIVO_DADOS + ' existe.</div></div>';
    } finally {
        carregando.classList.add('escondido');
    }
}

principal();
