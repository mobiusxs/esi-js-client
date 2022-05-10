// ESI Application Settings
const CLIENT_ID = 'd513b498c32048179f0b32c011d03f30';
const SCOPE = 'esi-calendar.respond_calendar_events.v1 esi-calendar.read_calendar_events.v1 esi-location.read_location.v1 esi-location.read_ship_type.v1 esi-mail.organize_mail.v1 esi-mail.read_mail.v1 esi-mail.send_mail.v1 esi-skills.read_skills.v1 esi-skills.read_skillqueue.v1 esi-wallet.read_character_wallet.v1 esi-wallet.read_corporation_wallet.v1 esi-search.search_structures.v1 esi-clones.read_clones.v1 esi-characters.read_contacts.v1 esi-universe.read_structures.v1 esi-bookmarks.read_character_bookmarks.v1 esi-killmails.read_killmails.v1 esi-corporations.read_corporation_membership.v1 esi-assets.read_assets.v1 esi-planets.manage_planets.v1 esi-fleets.read_fleet.v1 esi-fleets.write_fleet.v1 esi-ui.open_window.v1 esi-ui.write_waypoint.v1 esi-characters.write_contacts.v1 esi-fittings.read_fittings.v1 esi-fittings.write_fittings.v1 esi-markets.structure_markets.v1 esi-corporations.read_structures.v1 esi-characters.read_loyalty.v1 esi-characters.read_opportunities.v1 esi-characters.read_chat_channels.v1 esi-characters.read_medals.v1 esi-characters.read_standings.v1 esi-characters.read_agents_research.v1 esi-industry.read_character_jobs.v1 esi-markets.read_character_orders.v1 esi-characters.read_blueprints.v1 esi-characters.read_corporation_roles.v1 esi-location.read_online.v1 esi-contracts.read_character_contracts.v1 esi-clones.read_implants.v1 esi-characters.read_fatigue.v1 esi-killmails.read_corporation_killmails.v1 esi-corporations.track_members.v1 esi-wallet.read_corporation_wallets.v1 esi-characters.read_notifications.v1 esi-corporations.read_divisions.v1 esi-corporations.read_contacts.v1 esi-assets.read_corporation_assets.v1 esi-corporations.read_titles.v1 esi-corporations.read_blueprints.v1 esi-bookmarks.read_corporation_bookmarks.v1 esi-contracts.read_corporation_contracts.v1 esi-corporations.read_standings.v1 esi-industry.read_corporation_jobs.v1 esi-markets.read_corporation_orders.v1 esi-corporations.read_container_logs.v1 esi-industry.read_character_mining.v1 esi-industry.read_corporation_mining.v1 esi-planets.read_customs_offices.v1 esi-corporations.read_facilities.v1 esi-corporations.read_medals.v1 esi-characters.read_titles.v1 esi-alliances.read_contacts.v1 esi-characters.read_fw_stats.v1 esi-corporations.read_fw_stats.v1';
const CALLBACK_URL = 'http://localhost/auth/callback.html';

// Web Application Settings
const AUTHORIZATION_REDIRECT_URL = '/content/dashboard.html';
const LOGOUT_URL = '/auth/logout.html'
const LOGOUT_REDIRECT_URL = '/';

// Eve Online URLS
const HOST_URL = 'login.eveonline.com';
const AUTHORIZATION_URL = 'https://login.eveonline.com/v2/oauth/authorize/';
const TOKEN_URL = 'https://login.eveonline.com/v2/oauth/token';

// Require Authorization
if (document.currentScript.getAttribute('data-protected') === 'true') {
    if (window.sessionStorage.getItem('access_token') === null) {
        window.location.replace(LOGOUT_URL);
    }
}

// Map basic auth services
switch (document.currentScript.getAttribute('data-service')) {
    case null:
        break;
    case 'authorize':
        authorize();
        break;
    case 'callback':
        callback();
        break;
    case 'logout':
        logout();
        break;
    default:
        break;
}


/**
 * Builds URL for requesting one-time-use authorization code and redirects browser to it.
 * Stores all values that will be used to complete auth flow.
 */
function authorize() {
    // Generate one-time-use unique state and verifier and store them in sessionStorage
    const verifier = generateRandomString(512);
    const state = btoa(`${Date.now()}.${CLIENT_ID}.${verifier}`).slice(0, 31);
    window.sessionStorage.setItem('verifier', verifier);
    window.sessionStorage.setItem('state', state);

    // Generate the code challenge from the verifier and use it to construct authorization query parameters
    generateCodeChallenge(verifier).then(function(challenge) {
        const params = new URLSearchParams({
            'response_type': 'code',
            'redirect_uri': CALLBACK_URL,
            'client_id': CLIENT_ID,
            'scope': SCOPE,
            'code_challenge': challenge,
            'code_challenge_method': 'S256',
            'state': state
        });

        // Redirect browser to authorization URL
        window.location.replace(`${AUTHORIZATION_URL}?${params.toString()}`);
    })
}


/**
 * Capture one-time-use authorization code from callback request and use it to request access and refresh tokens.
 * Retrieves stored values to complete auth flow.
 * Stores tokens once auth flow is complete.
 */
function callback() {
    // Convert query string parameters into an object accessible via dot operator
    const params = new Proxy(new URLSearchParams(window.location.search), {get: (searchParams, prop) => searchParams.get(prop),});

    // Verify received state is same as stored state.
    // If not, handle as logout
    if (window.sessionStorage.getItem('state') !== params.state) {
        window.sessionStorage.removeItem('state');
        window.location.replace(LOGOUT_REDIRECT_URL);
        return
    }

    // TODO: switch to fetch
    // Use received one-time-use authorization code to request access token
    const Http = new XMLHttpRequest();
    Http.open('POST', TOKEN_URL);
    Http.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded')
    Http.send(new URLSearchParams({
        'grant_type': 'authorization_code',
        'code': params.code,
        'client_id': CLIENT_ID,
        'code_verifier': window.sessionStorage.getItem('verifier')
    }));

    Http.onreadystatechange = (e) => {
        if (Http.readyState === 4) {
            storeJWT(Http.responseText);

            // Delete obviated values
            window.sessionStorage.removeItem('verifier')
            window.sessionStorage.removeItem('state');

            window.location.replace(AUTHORIZATION_REDIRECT_URL);
        }
    }
}


function logout() {
    window.sessionStorage.clear();
    window.location.replace(LOGOUT_REDIRECT_URL);
}


function storeJWT(responseText) {
    const jwt = JSON.parse(responseText);
    window.sessionStorage.setItem('access_token', jwt.access_token);
    window.sessionStorage.setItem('expires_at', new Date().getTime() + jwt.expires_in);
    window.sessionStorage.setItem('refresh_token', jwt.refresh_token);
    window.sessionStorage.setItem('token_type', jwt.token_type);

    const access_token = parseAccessToken(jwt.access_token)
    window.sessionStorage.setItem('name', access_token.payload.name)
    window.sessionStorage.setItem('character_id', access_token.payload.sub.split(':')[2])
}


function parseAccessToken(accessToken) {
    const components = accessToken.split('.');
    return {
        'header': JSON.parse(atob(components[0])),
        'payload': JSON.parse(atob(components[1])),
        'signature': components[2]
    }
}


/**
 * Create a random string of URL safe characters.
 *
 * @param length integer - number of characters in the string
 * @returns {string} random string of characters
 */
function generateRandomString(length) {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    return text;
}


/**
 * Derive code challenge according to PKCE protocol using SHA256 and Base64
 *
 * @param codeVerifier string - random string
 * @returns {Promise<string>} code challenge to be used for auth flow
 */
async function generateCodeChallenge(codeVerifier) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier));
    return btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

/**
 * Retrieve Access Token for accessing protected ESI endpoints.
 * Use refresh token to obtain new access token if expired.
 * @returns {string} access token
 */
function getAccessToken() {
    // TODO: check if access_token is expired. If so, refresh first
    if (window.sessionStorage.getItem('expires_at') > new Date().getTime()) {
        console.log('token still valid');
        // TODO: return access_token
    } else {
        console.log('token expired');
        // TODO: refresh and then return access_token

        // const refreshToken = getRefreshToken();
        //
        // if (refreshToken === null) {
        //     window.location.replace(LOGOUT_REDIRECT_URL)
        //     return;
        // }
        //
        // const Http = new XMLHttpRequest();
        // Http.open('POST', TOKEN_URL);
        // Http.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded')
        // Http.send(new URLSearchParams({
        //     'grant_type': 'refresh_token',
        //     'host': HOST_URL,
        //     'refresh_token': refreshToken,
        //     'client_id': CLIENT_ID
        // }));
        //
        // Http.onreadystatechange = (e) => {
        //     if (Http.readyState === 4) {
        //         storeJWT(Http.responseText);
        //         return window.sessionStorage.getItem('access_token');
        //     }
        // }
    }
    return window.sessionStorage.getItem('access_token');
}


// const method = '';
// const url = '';
// const headers = {};
// const payload = JSON.stringify({}) || null
//
// fetch(url, {
//     method: method,
//     headers: headers,
//     body: payload
// })
//     .then(res => res.json())
//     .then(data => console.log(data))
//     .catch(error => console.log(error))
