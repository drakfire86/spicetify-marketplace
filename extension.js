// @ts-check

// NAME: Spicetify Marketplace Extension
// AUTHOR: theRealPadster, CharlieS1103
// DESCRIPTION: Companion extension for Spicetify Marketplace

/// <reference path="../spicetify-cli/globals.d.ts" />

// eslint-disable-next-line no-redeclare
const hexToRGB = (hex) => {
    if (hex.length === 3) {
        hex = hex.split("").map((char) => char + char).join("");
    } else if (hex.length != 6) {
        throw "Only 3- or 6-digit hex colours are allowed.";
    } else if (hex.match(/[^0-9a-f]/i)) {
        throw "Only hex colours are allowed.";
    }

    const aRgbHex = hex.match(/.{1,2}/g);
    const aRgb = [
        parseInt(aRgbHex[0], 16),
        parseInt(aRgbHex[1], 16),
        parseInt(aRgbHex[2], 16),
    ];
    return aRgb;
};

/**
 * Get user, repo, and branch from a GitHub raw URL
 * @param {string} url Github Raw URL
 * @returns { { user: string, repo: string, branch: string, filePath: string } }
 */
const getParamsFromGithubRaw = (url) => {
    // eslint-disable-next-line no-useless-escape
    const regex_result = url.match(/https:\/\/raw\.githubusercontent\.com\/(?<user>[^\/]+)\/(?<repo>[^\/]+)\/(?<branch>[^\/]+)\/(?<filePath>.+$)/);
    // e.g. https://raw.githubusercontent.com/CharlieS1103/spicetify-extensions/main/featureshuffle/featureshuffle.js

    const obj = {
        user: regex_result ? regex_result.groups.user : null,
        repo: regex_result ? regex_result.groups.repo : null,
        branch: regex_result ? regex_result.groups.branch : null,
        filePath: regex_result ? regex_result.groups.filePath : null,
    };

    return obj;
};

(async function MarketplaceExtension() {
    const { LocalStorage } = Spicetify;
    if (!(LocalStorage)) {
        // console.log('Not ready, waiting...');
        setTimeout(MarketplaceExtension, 1000);
        return;
    }

    // TODO: can we reference/require/import common files between extension and custom app?
    const LOCALSTORAGE_KEYS = {
        "installedExtensions": "marketplace:installed-extensions",
        "installedSnippets": "marketplace:installed-snippets",
        "installedThemes": "marketplace:installed-themes",
        "activeTab": "marketplace:active-tab",
        "tabs": "marketplace:tabs",
        // Theme installed store the localsorage key of the theme (e.g. marketplace:installed:NYRI4/Comfy-spicetify/user.css)
        "themeInstalled": "marketplace:theme-installed",
        "colorShift": "marketplace:colorShift",
    };

    const getLocalStorageDataFromKey = (key, fallback) => {
        const str = LocalStorage.get(key);
        if (!str) return fallback;

        const obj = JSON.parse(str);
        return obj;
    };

    const initializeExtension = (extensionKey) => {
        const extensionManifest = getLocalStorageDataFromKey(extensionKey);
        // Abort if no manifest found or no extension URL (i.e. a theme)
        if (!extensionManifest || !extensionManifest.extensionURL) return;

        console.log("Initializing extension: ", extensionManifest);

        const script = document.createElement("script");
        script.defer = true;
        script.src = extensionManifest.extensionURL;

        // If it's a github raw script, use jsdelivr
        if (script.src.indexOf("raw.githubusercontent.com") > -1) {
            const { user, repo, branch, filePath } = getParamsFromGithubRaw(extensionManifest.extensionURL);
            if (!user || !repo || !branch || !filePath) return;
            script.src = `https://cdn.jsdelivr.net/gh/${user}/${repo}@${branch}/${filePath}`;
        }

        document.body.appendChild(script);
    };

    /**
     * Loop through the snippets and add the contents of the code as a style tag in the DOM
     * @param { { title: string; description: string; code: string;}[] } snippets The snippets to initialize
     */
    // TODO: keep this in sync with the index.js file
    const initializeSnippets = (snippets) => {
        // Remove any existing marketplace snippets
        const existingSnippets = document.querySelector("style.marketplaceSnippets");
        if (existingSnippets) existingSnippets.remove();

        const style = document.createElement("style");
        const styleContent = snippets.reduce((accum, snippet) => {
            accum += `/* ${snippet.title} - ${snippet.description} */\n`;
            accum += `${snippet.code}\n`;
            return accum;
        }, "");

        style.innerHTML = styleContent;
        style.classList.add("marketplaceSnippets");
        document.head.appendChild(style);
    };

    // NOTE: Keep in sync with index.js
    const injectColourScheme = (scheme) => {
        try {
            // Remove any existing Spicetify scheme
            const existingColorsCSS = document.querySelector("link[href='colors.css']");
            if (existingColorsCSS) existingColorsCSS.remove();

            // Remove any existing marketplace scheme
            const existingMarketplaceSchemeCSS = document.querySelector("style.marketplaceCSS.marketplaceScheme");
            if (existingMarketplaceSchemeCSS) existingMarketplaceSchemeCSS.remove();

            // Add new marketplace scheme
            const schemeTag = document.createElement("style");
            schemeTag.classList.add("marketplaceCSS");
            schemeTag.classList.add("marketplaceScheme");
            // const theme = document.querySelector('#theme');
            let injectStr = ":root {";

            const themeIniKeys = Object.keys(scheme);
            themeIniKeys.forEach((key) => {
                injectStr += `--spice-${key}: #${scheme[key]};`;
                injectStr += `--spice-rgb-${key}: ${hexToRGB(scheme[key])};`;
            });
            injectStr += "}";
            schemeTag.innerHTML = injectStr;
            document.head.appendChild(schemeTag);
        } catch (error) {
            console.warn(error);
        }
    };

    /**
     * Update the user.css in the DOM
     * @param {string} userCSS The contents of the new user.css
     */
    const injectUserCSS = (userCSS) => {
        try {
            // Remove any existing Spicetify user.css
            const existingUserThemeCSS = document.querySelector("link[href='user.css']");
            if (existingUserThemeCSS) existingUserThemeCSS.remove();

            // Remove any existing marketplace scheme
            const existingMarketplaceUserCSS = document.querySelector("style.marketplaceCSS.marketplaceUserCSS");
            if (existingMarketplaceUserCSS) existingMarketplaceUserCSS.remove();

            // Add new marketplace scheme
            const userCssTag = document.createElement("style");
            userCssTag.classList.add("marketplaceCSS");
            userCssTag.classList.add("marketplaceUserCSS");
            userCssTag.innerHTML = userCSS;
            document.head.appendChild(userCssTag);
        } catch (error) {
            console.warn(error);
        }
    };

    // I guess this is okay to not have an end condition on the interval
    // because if they turn the setting on or off,
    // closing the settings modal will reload the page
    const initColorShiftLoop = (schemes) => {
        let i = 0;
        const NUM_SCHEMES = Object.keys(schemes).length;
        setInterval(() => {
            // Resets to zero when passes the last scheme
            i = i % NUM_SCHEMES;
            const style = document.createElement("style");
            style.className = "colorShift-style";
            style.innerHTML = `* {
                transition-duration: 400ms;
            }
            main-type-bass {
                transition-duration: unset !important;
            }`;

            document.body.appendChild(style);
            injectColourScheme(Object.values(schemes)[i]);
            i++;
            style.remove();
        }, 60 * 1000);
    };

    const parseCSS = async (themeManifest) => {

        const userCssUrl = themeManifest.cssURL.indexOf("raw.githubusercontent.com") > -1
        // TODO: this should probably be the URL stored in localstorage actually (i.e. put this url in localstorage)
            ? `https://cdn.jsdelivr.net/gh/${themeManifest.user}/${themeManifest.repo}@${themeManifest.branch}/${themeManifest.manifest.usercss}`
            : themeManifest.cssURL;
        // TODO: Make this more versatile
        const assetsUrl = userCssUrl.replace("/user.css", "/assets/");

        console.log("Parsing CSS: ", userCssUrl);
        let css = await fetch(userCssUrl).then(res => res.text());
        // console.log("Parsed CSS: ", css);

        let urls = css.matchAll(/url\(['|"](?<path>.+?)['|"]\)/gm) || [];

        for (const match of urls) {
            const url = match.groups.path;
            // console.log(url);
            // If it's a relative URL, transform it to HTTP URL
            if (!url.startsWith("http") && !url.startsWith("data")) {
                const newUrl = assetsUrl + url.replace(/\.\//g, "");
                css = css.replace(url, newUrl);
            }
        }

        // console.log("New CSS: ", css);

        return css;
    };

    const initializeTheme = async (themeKey) => {
        const themeManifest = getLocalStorageDataFromKey(themeKey);
        // Abort if no manifest found
        if (!themeManifest) {
            console.log("No theme manifest found");
            return;
        }

        console.log("Initializing theme: ", themeManifest);

        // Inject colour scheme if found
        if (themeManifest.schemes) {
            const activeScheme = themeManifest.schemes[themeManifest.activeScheme];
            injectColourScheme(activeScheme);

            if (localStorage.getItem(LOCALSTORAGE_KEYS.colorShift) === "true") {
                initColorShiftLoop(themeManifest.schemes);
            }
        } else {
            console.warn("No schemes found for theme");
        }

        // Remove default css
        // TODO: what about if we remove the theme? Should we re-add the user.css/colors.css?
        // const existingUserThemeCSS = document.querySelector("link[href='user.css']");
        // if (existingUserThemeCSS) existingUserThemeCSS.remove();

        // Remove any existing marketplace theme
        const existingMarketplaceThemeCSS = document.querySelector("link.marketplaceCSS");
        if (existingMarketplaceThemeCSS) existingMarketplaceThemeCSS.remove();

        // Add theme css
        const userCSS = await parseCSS(themeManifest);
        injectUserCSS(userCSS);

        // Inject any included js
        if (themeManifest.include && themeManifest.include.length) {
            // console.log("Including js", installedThemeData.include);

            themeManifest.include.forEach((script) => {
                const newScript = document.createElement("script");
                let src = script;
                // If it's a github raw script, use jsdelivr
                if (script.indexOf("raw.githubusercontent.com") > -1) {
                    const { user, repo, branch, filePath } = getParamsFromGithubRaw(script);
                    src = `https://cdn.jsdelivr.net/gh/${user}/${repo}@${branch}/${filePath}`;
                }
                // console.log({src});
                newScript.src = src;
                newScript.classList.add("marketplaceScript");
                document.body.appendChild(newScript);
            });
        }
    };

    console.log("Loaded Marketplace extension");

    const installedThemeKey = LocalStorage.get(LOCALSTORAGE_KEYS.themeInstalled);
    if (installedThemeKey) initializeTheme(installedThemeKey);

    const installedSnippetKeys = getLocalStorageDataFromKey(LOCALSTORAGE_KEYS.installedSnippets, []);
    const installedSnippets = installedSnippetKeys.map((key) => getLocalStorageDataFromKey(key));
    initializeSnippets(installedSnippets);

    const installedExtensions = getLocalStorageDataFromKey(LOCALSTORAGE_KEYS.installedExtensions, []);
    installedExtensions.forEach((extensionKey) => initializeExtension(extensionKey));
})();
const ITEMS_PER_REQUEST = 100;
async function storeThemes() {
    const BLACKLIST = await Blacklist();
    let url = `https://api.github.com/search/repositories?q=${encodeURIComponent("topic:spicetify-themes")}&per_page=${ITEMS_PER_REQUEST}`;
    const allRepos = await fetch(url).then(res => res.json()).catch(() => []);
    if (!allRepos.items) {
        Spicetify.showNotification("Too Many Requests, Cool Down.");
    }
    const filteredResults = {
        ...allRepos,
        items: allRepos.items.filter(item => !BLACKLIST.includes(item.html_url)),
    };
    return filteredResults;
}
async function storeExtensions() {
    const BLACKLIST = await Blacklist();
    let url = `https://api.github.com/search/repositories?q=${encodeURIComponent("topic:spicetify-extensions")}&per_page=${ITEMS_PER_REQUEST}`;
    console.log(url);
    const allRepos = await fetch(url).then(res => res.json()).catch(() => []);
    if (!allRepos.items) {
        Spicetify.showNotification("Too Many Requests, Cool Down.");
    }
    const filteredResults = {
        ...allRepos,
        items: allRepos.items.filter(item => !BLACKLIST.includes(item.html_url)),
    };
    return filteredResults;
}
async function Blacklist() {
    const url = "https://raw.githubusercontent.com/CharlieS1103/spicetify-marketplace/main/blacklist.json";
    const jsonReturned = await fetch(url).then(res => res.json()).catch(() => { });
    return jsonReturned.repos;
}
(async function initializePreload() {
    // Begin by getting the themes and extensions from github
    const extensionsArray = await storeExtensions();
    const themesArray = await storeThemes();

    appendInformationToLocalStorage(themesArray, "theme");
    appendInformationToLocalStorage(extensionsArray, "extension");
})();

async function appendInformationToLocalStorage(array, type) {
    // This system should make it so themes and extensions are stored concurrently
    if (type == "theme") {
        for (const repo of array.items) {
            await sleep(10000);
            let themes = await fetchThemes(repo.contents_url, repo.default_branch);

            // TODO Implement checks to make sure the theme is valid
            if (themes[0]) {
                addToSessionStorage(themes);
            }
        }
    } else if (type == "extension") {
        for (const repo of array.items) {
            await sleep(10000);
            let extensions = await fetchExtensions(repo.contents_url, repo.default_branch);
            // TODO: Implement checks to make sure it's a valid extension
            if (extensions[0]) {
                addToSessionStorage(extensions);
            }

        }
    }
}
// This function is used to fetch manifest of a theme and return it
async function fetchThemes(contents_url, branch) {
    try {
        const regex_result = contents_url.match(/https:\/\/api\.github\.com\/repos\/(?<user>.+)\/(?<repo>.+)\/contents/);
        // TODO: err handling?
        if (!regex_result || !regex_result.groups) return null;
        let { user, repo } = regex_result.groups;
        let manifests = await getRepoManifest(user, repo, branch);
        // If the manifest returned is not an array, initialize it as one
        if (!Array.isArray(manifests)) manifests = [manifests];
        manifests.user = user;
        manifests.repo = repo;
        return manifests;
    }
    catch (err) {
        console.warn(contents_url, err);
        return null;
    }
}
// This function is used to fetch manifest of an extension and return it
async function fetchExtensions(contents_url, branch) {
    try {
        // TODO: use the original search full_name ("theRealPadster/spicetify-hide-podcasts") or something to get the url better?
        const regex_result = contents_url.match(/https:\/\/api\.github\.com\/repos\/(?<user>.+)\/(?<repo>.+)\/contents/);
        // TODO: err handling?
        if (!regex_result || !regex_result.groups) return null;
        const { user, repo } = regex_result.groups;
        let manifests = await getRepoManifest(user, repo, branch);
        // If the manifest returned is not an array, initialize it as one
        if (!Array.isArray(manifests)) manifests = [manifests];
        manifests.user = user;
        manifests.repo = repo;
        return manifests;
    }
    catch (err) {
        console.warn(contents_url, err);
        return null;
    }
}

async function getRepoManifest(user, repo, branch) {
    const url = `https://raw.githubusercontent.com/${user}/${repo}/${branch}/manifest.json`;

    return await fetch(url).then(res => res.json()).catch(() => null);
}
// This function appends an array to session storage
function addToSessionStorage(items) {
    if (!items || items == null) return;
    items.forEach(item => {
        // If the key already exists, it will append to it instead of overwriting it
        const existing = window.sessionStorage.getItem(items.user + "-"+items.repo);
        const parsed = existing ? JSON.parse(existing) : [];
        parsed.push(item);
        window.sessionStorage.setItem(items.user + "-" + items.repo, JSON.stringify(parsed));

    });

}
// This function is used to sleep for a certain amount of time
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}