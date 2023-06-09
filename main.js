import { createAuth0Client } from '@auth0/auth0-spa-js';
import './styles.css'
import { initApp } from './app.js';

const scopes = [
  'read:current_user',
  'update:current_user',
  'read:connections',
  'write:connections',
  'read:maps',
  'write:maps',
  'read:account',
  'admin:account',
]
const clientId = import.meta.env.VITE_CLIENT_ID;

let auth0Client, accessToken;

async function initAuth() {
  auth0Client = await createAuth0Client({
    domain: 'auth.carto.com',
    clientId,
    authorizationParams: {
      redirect_uri: window.location.origin,
      scopes: scopes.join(' '),
      audience: 'carto-cloud-native-api'
    }
  })

  if (location.search.includes('state=') && 
      (location.search.includes('code=') || 
      location.search.includes('error='))) {
    await auth0Client.handleRedirectCallback();
    window.history.replaceState({}, document.title, '/');
  }

  const isAuthenticated = await auth0Client.isAuthenticated();
  const appEl = document.getElementById('app');

  if (isAuthenticated) {
    appEl.classList.add('isAuthenticated');
    const userProfile = await auth0Client.getUser();
    accessToken = await auth0Client.getTokenSilently();

    const profileEl = document.getElementById('profile');
    profileEl.innerHTML = `
            <p>${userProfile.name}</p>
            <img src='${userProfile.picture}' />
          `;
    initApp(accessToken)
    
  } else {
    appEl.classList.remove('isAuthenticated');
  }
}

// Logout
const logoutButton = document.getElementById('logout');
logoutButton.addEventListener('click', (e) => {
  e.preventDefault();
  auth0Client.logout();
});

// Login
const loginButton = document.getElementById('login');
loginButton.addEventListener('click', (e) => {
  e.preventDefault();
  auth0Client.loginWithRedirect();
});

initAuth()