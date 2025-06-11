const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

app.use(session({
  secret: 'chave-secreta',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1800000 } // 30 minutos
}));

let equipes = [];
let jogadores = [];

function auth(req, res, next) {
  if (req.session.logado) return next();
  res.redirect('/login');
}

app.get('/', (req, res) => res.redirect('/login'));

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'login.html'));
});

app.post('/login', (req, res) => {
  const { usuario, senha } = req.body;
  if (usuario === 'admin' && senha === '123') {
    req.session.logado = true;

    const dataFormatada = new Date().toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    res.cookie('ultimoAcesso', dataFormatada);
    return res.redirect('/menu');
  }
  res.send('<script>alert("Login inválido!");window.location="/login";</script>');
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/login');
  });
});

app.get('/menu', auth, (req, res) => {
  const ultimoAcesso = req.cookies.ultimoAcesso || 'Primeiro acesso';
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <link rel="stylesheet" href="/public/style.css">
      <title>Menu</title>
    </head>
    <body>
      <div class="container">
        <h1>Menu do Sistema</h1>
        <p>Último acesso: ${ultimoAcesso}</p>
        <ul>
          <li><a href="/cadastro-equipe">Cadastrar Equipe</a></li>
          <li><a href="/cadastro-jogador">Cadastrar Jogador</a></li>
        </ul>
        <a href="/logout">Sair</a>
      </div>
    </body>
    </html>
  `);
});

app.get('/cadastro-equipe', auth, (req, res) => {
  res.sendFile(path.join(__dirname, 'pages', 'cadastro-equipe.html'));
});

app.post('/cadastro-equipe', auth, (req, res) => {
  const { nomeEquipe, tecnico, telefone } = req.body;
  if (!nomeEquipe || !tecnico || !telefone) {
    return res.send('<script>alert("Preencha todos os campos"); window.history.back();</script>');
  }
  equipes.push({ nomeEquipe, tecnico, telefone });

  let lista = `
    <!DOCTYPE html>
    <html>
    <head>
      <link rel="stylesheet" href="/public/style.css">
      <title>Equipes</title>
    </head>
    <body>
    <div class="container">
      <h2>Equipes Cadastradas</h2><ul>`;
  for (const e of equipes) {
    lista += `<li>${e.nomeEquipe} - Técnico: ${e.tecnico} - Tel: ${e.telefone}</li>`;
  }
  lista += `</ul>
      <a href="/cadastro-equipe">Cadastrar outra</a> | <a href="/menu">Menu</a>
    </div></body></html>`;
  res.send(lista);
});

app.get('/cadastro-jogador', auth, (req, res) => {
  if (equipes.length === 0) {
    return res.send('<link rel="stylesheet" href="/public/style.css"><div class="container>"<p>Cadastre pelo menos uma equipe antes de adicionar jogadores.</p><a href="/cadastro-equipe">Cadastrar equipe</a></div>');
  }
  let options = equipes.map(eq => `<option value="${eq.nomeEquipe}">${eq.nomeEquipe}</option>`).join('');
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <link rel="stylesheet" href="/public/style.css">
      <title>Cadastro de Jogador</title>
    </head>
    <body>
    <div class="container">
      <h2>Cadastro de Jogador</h2>
      <form method="POST" action="/cadastro-jogador">
        Nome: <input name="nome" required><br>
        Número: <input name="numero" required><br>
        Nascimento: <input type="date" name="nascimento" required><br>
        Altura (cm): <input name="altura" required><br>
        Gênero:
        <select name="genero" required>
          <option>Masculino</option>
          <option>Feminino</option>
        </select><br>
        Posição: <input name="posicao" required><br>
        Equipe:
        <select name="equipe" required>
          ${options}
        </select><br>
        <button type="submit">Cadastrar</button>
      </form>
      <a href="/menu">Menu</a>
    </div></body></html>
  `);
});

app.post('/cadastro-jogador', auth, (req, res) => {
  const { nome, numero, nascimento, altura, genero, posicao, equipe } = req.body;
  if (!nome || !numero || !nascimento || !altura || !genero || !posicao || !equipe) {
    return res.send('<script>alert("Preencha todos os campos"); window.history.back();</script>');
  }

  const jogadoresEquipe = jogadores.filter(j => j.equipe === equipe);
  if (jogadoresEquipe.length >= 6) {
    return res.send(`<script>alert("A equipe '${equipe}' já tem 6 jogadores!"); window.history.back();</script>`);
  }

  jogadores.push({ nome, numero, nascimento, altura, genero, posicao, equipe });

  let agrupados = {};
  jogadores.forEach(j => {
    if (!agrupados[j.equipe]) agrupados[j.equipe] = [];
    agrupados[j.equipe].push(j);
  });

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <link rel="stylesheet" href="/public/style.css">
      <title>Lista de Jogadores</title>
    </head>
    <body>
    <div class="container">
      <h1>Jogadores por Equipe</h1>`;
  for (let equipe in agrupados) {
    html += `<h2>${equipe}</h2><ul>`;
    agrupados[equipe].forEach(j => {
      const nascBR = new Date(j.nascimento).toLocaleDateString('pt-BR');
      html += `<li>${j.nome} - nº ${j.numero} - ${j.posicao} - Nasc: ${nascBR} - Altura: ${j.altura} cm</li>`;
    });
    html += '</ul>';
  }

  html += '<a href="/cadastro-jogador">Cadastrar outro</a> | <a href="/menu">Menu</a></div></body></html>';
  res.send(html);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor online em http://localhost:${PORT}`));
