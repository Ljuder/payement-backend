<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
</head>
<body>

<h1>Payment Backend</h1>

<p>
Backend Node.js pour une plateforme de paiement interne avec gestion d'utilisateurs,
de rôles, de magasins, de produits et intégration d'un service de paiement externe.
</p>

<hr />

<h2>Principe de l'application</h2>

<p>Cette application fournit une API permettant :</p>
<ul>
  <li>L'authentification sécurisée des utilisateurs</li>
  <li>La gestion de rôles hiérarchiques</li>
  <li>Un portefeuille interne par utilisateur</li>
  <li>La gestion de magasins, catégories et produits</li>
  <li>L'achat de produits avec transactions sécurisées</li>
  <li>La recharge du solde via un fournisseur de paiement (SumUp)</li>
</ul>

<hr />

<h2>Rôles</h2>

<ul>
  <li><strong>ADMIN</strong> : gestion complète et création des comptes</li>
  <li><strong>TREASURER</strong> : gestion des magasins et crédit manuel des comptes</li>
  <li><strong>OWNER</strong> : gestion des produits et catégories de ses magasins</li>
  <li><strong>USER</strong> : recharge du solde et paiements</li>
</ul>

<hr />

<h2>Technologies</h2>

<ul>
  <li>Node.js</li>
  <li>Express.js</li>
  <li>Prisma ORM</li>
  <li>SQLite</li>
  <li>JWT (access token et refresh token)</li>
  <li>SumUp API (sandbox)</li>
</ul>

<hr />

<h2>Installation</h2>

<h3>Prérequis</h3>
<ul>
  <li>Node.js (v18 ou plus)</li>
  <li>npm</li>
  <li>SQLite</li>
  <li>Prisma (v6 car la v7 ne fonctionne pas à l'instant ou j'écris ces lignes)</li>
  <li>csv-writer</li>
</ul>

<h3>Cloner le projet</h3>
<pre><code>git clone https://github.com/&lt;votre-user&gt;/payment-backend.git
cd payment-backend</code></pre>

<h3>Installer les dépendances</h3>
<pre><code>npm install</code></pre>
<h4>(Pour Prisma)</h4>
<pre><code>npm install @prisma/client@6
npm install -D prisma@6</code></pre>

<h3>Configuration</h3>
<pre><code>cp .env.example .env</code></pre>

<p>Exemple de variables d'environnement :</p>
<pre><code>DATABASE_URL="file:./prisma/dev.db"
JWT_SECRET=secret1
REFRESH_JWT_SECRET=secret2
SUMUP_CLIENT_ID=your_sumup_client_id
SUMUP_CLIENT_SECRET=your_sumup_client_secret
SUMUP_ENV=sandbox</code></pre>

<hr />

<h2>Base de données</h2>

<pre><code>npx prisma migrate dev
npx prisma generate</code></pre>

<hr />

<h2>Lancer le serveur</h2>

<pre><code>npm run dev</code></pre>

<p>Le serveur est accessible sur :</p>
<pre><code>http://localhost:5050</code></pre>

<hr />

<h2>Paiement</h2>

<p>
L'intégration du paiement est réalisée via une couche d'abstraction permettant
de changer facilement de fournisseur de paiement.
</p>

<hr />

<h2>Tests</h2>

<p>Les endpoints peuvent être testés à l'aide de Postman.</p>

<hr />

<h2>Sécurité</h2>

<ul>
  <li>Mots de passe hashés</li>
  <li>JWT à durée de vie limitée</li>
  <li>Refresh tokens</li>
  <li>Transactions atomiques Prisma</li>
</ul>

<hr />

<h2>Auteur</h2>
<p>Donatien</p>

</body>
</html>
