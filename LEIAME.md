# Mapa da Capoeira

Mapa interativo de locais de treino de capoeira, alimentado por um arquivo CSV simples. Basta atualizar o CSV e o mapa se atualiza sozinho.

## Como executar localmente

O projeto precisa ser servido via HTTP (abrir o `index.html` direto no navegador **não funciona**, pois o navegador bloqueia requisições `fetch` para arquivos locais).

### Opção 1 — Python (já vem instalado na maioria dos sistemas)

```bash
cd MapaDaCapoeira
python3 -m http.server 8000
```

Abra http://localhost:8000 no navegador.

### Opção 2 — Node.js (se tiver `npx` disponível)

```bash
cd MapaDaCapoeira
npx serve .
```

### Opção 3 — VS Code

Instale a extensão **Live Server**, clique com o botão direito no `index.html` e escolha "Open with Live Server".

## Estrutura do projeto

```
MapaDaCapoeira/
├── index.html     Página principal (carrega o mapa)
├── estilo.css     Estilos visuais
├── mapa.js        Lógica de leitura do CSV, geocodificação e marcadores
├── dados.csv      Dados dos locais de treino
└── LEIAME.md      Este arquivo
```

## Formato do CSV

O arquivo `dados.csv` deve ter o seguinte cabeçalho obrigatório:

| Coluna                  | Descrição                                                                | Exemplo                                               |
| ----------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------- |
| **Endereço**            | Endereço completo do local (inclua cidade e estado para melhor precisão) | `"Rua Independência 285, Dourados, MS"`               |
| **Nome do Responsável** | Nome do mestre ou pessoa responsável                                     | `Mestre Guerreiro`                                    |
| **Telefone de Contato** | Telefone de contato                                                      | `67 9849-4129`                                        |
| **Grupo**               | Nome do grupo de capoeira                                                | `Associação de Capoeira Baiana`                       |
| **Estilo**              | Estilo de capoeira                                                       | `Contemporânea`                                       |
| **Horários de Treino**  | Lista separada por `;` com dia(s) e horário(s)                           | `"Seg 19:30-21:00;Quar 19:30-21:00;Sext 19:30-21:00"` |

### Colunas opcionais

Se quiser pular a geocodificação automática (útil quando o endereço não é encontrado corretamente), adicione as colunas `Latitude` e `Longitude`:

```csv
Endereço,Nome do Responsável,Telefone de Contato,Grupo,Estilo,Horários de Treino,Latitude,Longitude
"Rua Independência 285, Dourados, MS","Mestre Guerreiro","67 9849-4129","Associação de Capoeira Baiana","Contemporânea","Seg 19:30-21:00;Quar 19:30-21:00;Sext 19:30-21:00",-22.2218,-54.8054
```

Quando essas colunas existem e têm valores válidos, o mapa usa as coordenadas diretamente sem consultar a API de geocodificação.

### Exemplo de CSV completo

```csv
Endereço,Nome do Responsável,Telefone de Contato,Grupo,Estilo,Horários de Treino
"Rua Independência 285, Dourados, MS","Mestre Guerreiro","67 9849-4129","Associação de Capoeira Baiana","Contemporânea","Seg 19:30-21:00;Quar 19:30-21:00;Sext 19:30-21:00"
"AJI - Aldeia Bororó, Dourados, MS","Bruno Grãos","67 98187-9226","Centro Cultural Grãos","Angola","Sábados 9h"
```

## Como funciona

1. Ao abrir a página, o `mapa.js` lê o arquivo `dados.csv`
2. Cada endereço é convertido em coordenadas (latitude/longitude) usando o **Nominatim** (serviço gratuito do OpenStreetMap)
3. Os resultados de geocodificação são guardados no `localStorage` do navegador como cache — endereços já buscados não são consultados novamente
4. Marcadores verdes são colocados no mapa para cada local encontrado
5. Clicando num marcador, abre-se um popup com todas as informações do local
6. O painel lateral esquerdo lista todos os locais e permite navegar clicando no nome

## Como atualizar os dados

1. Edite o arquivo `dados.csv` (adicione, remova ou altere linhas)
2. Recarregue a página no navegador
3. Pronto — o mapa reflete as mudanças

### Dica para endereços que não aparecem no mapa

Se algum endereço não for localizado pela geocodificação automática:

- Certifique-se de que o campo **Endereço** inclui a cidade e o estado (ex.: `"Rua X, Campo Grande, MS"`)
- Se ainda assim não funcionar, adicione as colunas **Latitude** e **Longitude** manualmente ao CSV (você pode obtê-las pesquisando o endereço no [OpenStreetMap](https://www.openstreetmap.org/search) e copiando as coordenadas que aparecem na URL)
- Para limpar o cache de geocodificação e forçar uma nova busca, abra o console do navegador (F12) e execute: `localStorage.removeItem('mapacapoeira_geocode')`

## Tecnologias usadas

| Tecnologia        | Uso                                     | Por quê                                         |
| ----------------- | --------------------------------------- | ----------------------------------------------- |
| **Leaflet.js**    | Renderização do mapa                    | Gratuito, sem necessidade de chave de API, leve |
| **OpenStreetMap** | Tiles do mapa                           | Gratuito e de código aberto                     |
| **Nominatim**     | Geocodificação (endereço → coordenadas) | Gratuito, sem cadastro necessário               |

Não é usada nenhuma dependência local, framework ou ferramenta de build. Tudo roda no navegador.

## Publicação online

O projeto é composto apenas por arquivos estáticos, então pode ser hospedado em qualquer servidor estático gratuito:

- **GitHub Pages** — suba os arquivos para um repositório e ative o Pages nas configurações
- **Netlify** — arraste a pasta para o painel do Netlify
- **Vercel** — conecte ao repositório Git
