(function () {
  "use strict";
  const FDT = window.FDT = window.FDT || {};
  const navGroups = [
    { label: "CORE MODULES", links: [
      ["Dashboard", "/dashboard", "home"], ["Corridor Risk Map", "/risk-map", "map"],
      ["Scenario Simulator", "/simulator", "route"], ["GenAI Assistant", "/assistant", "sparkle"],
      ["Scenario Library", "/library", "library"]
    ] },
    { label: "FLEET & PLANNING", links: [
      ["Vehicles & Trips", "/vehicles", "fleet"], ["Departure Planner", "/departure", "clock"],
      ["Risk Hotspots", "/hotspots", "heat"], ["Model & Validation", "/model", "chart"]
    ] },
    { label: "ACCOUNT", links: [
      ["Alerts", "/alerts", "bell", "3"], ["Profile", "/profile", "person"], ["Preferences", "/preferences", "settings"]
    ] },
    { label: "PROTOTYPE", links: [["Prototype Guide", "/guide", "guide"]] }
  ];
  const roleHomes = { dispatcher: "/dashboard", operator: "/vehicles", planner: "/hotspots", researcher: "/model" };
  // Keep the most relevant destinations visible while every other screen stays under More.
  const primaryNav = {
    dispatcher: ["/dashboard", "/risk-map", "/simulator", "/assistant", "/library", "/alerts"],
    operator: ["/vehicles", "/departure"],
    planner: ["/hotspots"],
    researcher: ["/model"]
  };

  const iconPaths = {
    home: "M3 10.5 12 3l9 7.5M5 9v11h14V9M9 20v-6h6v6",
    menu: "M4 6h16M4 12h16M4 18h16",
    map: "M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15",
    route: "M5 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm14-10a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM7 17h4a3 3 0 0 0 3-3V9a3 3 0 0 1 3-3h1",
    sparkle: "m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Zm7 12 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z",
    library: "M4 4h16v16H4zM8 8h8M8 12h8M8 16h5",
    fleet: "M3 7h12v10H3zM15 10h4l3 3v4h-7zM7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm11 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
    truck: "M3 7h12v10H3zM15 10h4l3 3v4h-7zM7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm11 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
    bus: "M5 4h14a2 2 0 0 1 2 2v12H3V6a2 2 0 0 1 2-2Zm-2 5h18M7 18v2m10-2v2M7 13h3m4 0h3",
    car: "M5 11 7 6h10l2 5 2 1v5H3v-5l2-1Zm2 0h10M7 17h.01M17 17h.01",
    van: "M3 7h12v10H3zM15 10h4l3 3v4h-7zM7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm11 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z",
    clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 4v5l4 2",
    heat: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
    chart: "M4 20V4m0 16h17M8 16l4-5 3 2 5-7",
    bell: "M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 12h4",
    person: "M20 21a8 8 0 0 0-16 0m8-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
    settings: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-5v2m0 14v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M3 12h2m14 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
    guide: "M4 5.5A3.5 3.5 0 0 1 7.5 2H20v17H7.5A3.5 3.5 0 0 0 4 22V5.5Zm0 12A3.5 3.5 0 0 1 7.5 14H20"
  };
  FDT.icon = function (name) {
    return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + (iconPaths[name] || iconPaths.guide) + '"></path></svg>';
  };

  function unreadAlerts() {
    if (!FDT.data) return 3;
    return FDT.data.alerts.filter(function (alert) {
      return !alert.closed && !alert.read && !FDT.state.alertsRead.includes(alert.id) && !FDT.state.closedAlerts.includes(alert.id);
    }).length;
  }

  function iconButton(label, content, className, action) {
    return '<button class="button button--icon ' + (className || "") + '" type="button" aria-label="' + label + '" data-action="' + action + '">' + content + '</button>';
  }

  function getNavMarkup(route) {
    const role = FDT.state.user && FDT.state.user.role;
    const primaryPaths = primaryNav[role] || [roleHomes[role] || "/dashboard"];
    function renderGroups(isPrimary) {
      return navGroups.map(function (group) {
        const links = group.links.filter(function (item) { return primaryPaths.includes(item[1]) === isPrimary; });
        if (!links.length) return "";
        return '<section class="nav-group" aria-label="' + group.label + '"><h2 class="nav-group__title">' + group.label + '</h2>' +
          links.map(function (item) {
          const current = route.path === item[1] || route.path.indexOf(item[1] + "/") === 0;
          const count = item[1] === "/alerts" ? unreadAlerts() : item[3];
          return '<a class="nav-link" href="#' + item[1] + '"' + (current ? ' aria-current="page"' : "") + '><span class="nav-link__icon">' + FDT.icon(item[2]) + '</span><span>' + item[0] + '</span>' + (count ? '<span class="nav-count" aria-label="' + count + ' unread alerts">' + count + '</span>' : "") + '</a>';
          }).join("") + '</section>';
      }).join("");
    }
    const currentIsMore = !primaryPaths.some(function (path) { return route.path === path || route.path.indexOf(path + "/") === 0; });
    return renderGroups(true) + '<details class="nav-more"' + (currentIsMore ? " open" : "") + '><summary>More</summary>' + renderGroups(false) + '</details>';
  }

  FDT.renderShell = function (route) {
    const root = FDT.$("#app");
    if (!FDT.state.user || route.page === "login") {
      root.innerHTML = '<section id="page-content" class="page-content" aria-label="Page content"></section>';
      return;
    }
    const user = FDT.state.user;
    const initials = user.name.split(/\s+/).map(function (part) { return part.charAt(0); }).join("").slice(0, 2).toUpperCase();
    root.innerHTML = [
      '<div class="prototype-banner"><span class="prototype-banner__message"><strong>PROTOTYPE</strong> &nbsp; Dummy data only · no backend · items marked [SIMULATED] would be real in the built product</span>',
      '<div class="prototype-banner__actions"><button type="button" data-action="toggle-notes" class="design-note-toggle" aria-pressed="' + String(FDT.state.preferences.designNotes) + '">Design notes: ' + (FDT.state.preferences.designNotes ? "on" : "off") + '</button><button type="button" data-navigate="/guide">Prototype guide</button></div></div>',
      '<div class="app-shell" id="app-shell"><button class="sidebar-scrim" type="button" aria-label="Close navigation" data-action="close-drawer"></button>',
      '<aside class="sidebar" id="sidebar" aria-label="Main navigation"><a class="brand" href="#/dashboard"><span class="brand__mark" aria-hidden="true">AI</span><span><span class="brand__name">Freight Disruption<br>Digital Twin</span><span class="brand__meta">2 pilot corridors</span></span></a>',
      '<nav class="sidebar-nav">' + getNavMarkup(route) + '</nav><div class="sidebar__footer"><strong>Signed in as ' + FDT.escapeHtml(user.name) + '</strong>' + FDT.escapeHtml(user.roleTitle) + '</div></aside>',
      '<div class="main-column"><header class="topbar"><div class="topbar__left">' + iconButton("Open navigation", FDT.icon("menu"), "mobile-menu-button", "open-drawer") +
      '<label class="sr-only" for="corridor-select">Choose corridor</label><select class="button topbar__corridor" id="corridor-select" aria-label="Choose corridor"><option value="mumbai-bengaluru">Mumbai → Bengaluru</option><option value="chennai-bengaluru">Chennai → Bengaluru</option></select>',
      '<span class="topbar__breadcrumb" aria-label="Breadcrumb">/ ' + FDT.escapeHtml(route.title) + '</span></div>',
      '<div class="topbar__right"><span class="pill pill--info topbar__synthetic"><span class="status-dot" aria-hidden="true"></span>Synthetic data</span><span class="pill pill--neutral topbar__badge-optional">Forecast 10:00 IST <span class="simulated">Simulated</span></span>',
      '<label class="sr-only" for="role-select">View as role</label><select class="button topbar__select topbar__role" id="role-select"><option value="dispatcher">Dispatcher</option><option value="operator">Fleet Operator</option><option value="planner">Highway Planner</option><option value="researcher">Researcher</option></select>',
      iconButton("Alerts, " + unreadAlerts() + " unread", FDT.icon("bell") + '<span class="nav-count">' + unreadAlerts() + '</span>', "", "navigate-alerts") +
      '<details class="profile-menu"><summary class="avatar" aria-label="Open account menu">' + initials + '</summary><div class="profile-menu__panel"><p><strong>' + FDT.escapeHtml(user.name) + '</strong><br><span class="muted">' + FDT.escapeHtml(user.roleTitle) + '</span></p><a href="#/profile">Profile</a><a href="#/preferences">Preferences</a><button type="button" data-action="logout">Log out</button></div></details></div></header>',
      '<section id="page-content" class="content-area page-content" aria-label="Page content" tabindex="-1"></section></div></div>'
    ].join("");
    FDT.$("#corridor-select").value = FDT.state.corridorId;
    FDT.$("#role-select").value = user.role;
  };

  FDT.updateActiveNavigation = function (route) {
    FDT.$$(".nav-link").forEach(function (link) {
      const path = link.getAttribute("href").slice(1);
      if (route.path === path || route.path.indexOf(path + "/") === 0) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    const breadcrumb = FDT.$(".topbar__breadcrumb");
    if (breadcrumb) breadcrumb.textContent = "/ " + route.title;
  };

  FDT.renderPageStub = function (root, title, description) {
    root.innerHTML = '<header class="page-heading"><div><p class="small muted">Freight Disruption Digital Twin</p><h1>' + FDT.escapeHtml(title) + '</h1><p>' + FDT.escapeHtml(description) + '</p></div><div class="page-actions"><span class="simulated">Simulated prototype</span></div></header><section class="stub-panel" aria-label="' + FDT.escapeHtml(title) + ' preview"><div class="stub-panel__inner"><h2>More detail is coming in a later build phase</h2><p>This screen is connected to the prototype navigation. Its data and interactive components will be added in the next phases.</p></div></section>' +
      (FDT.state.preferences.designNotes ? '<aside class="design-note" aria-label="Design note">1 · This page is a route-ready placeholder for the next build phase.</aside>' : "");
  };

  function showToast(message) {
    const region = FDT.$("#toast-region");
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.textContent = message;
    region.append(toast);
    window.setTimeout(function () { toast.remove(); }, 3200);
  }
  FDT.toast = showToast;

  function closeDrawer() {
    const shell = FDT.$("#app-shell");
    if (shell) shell.classList.remove("drawer-open");
    const opener = FDT.$('[data-action="open-drawer"]');
    if (opener) opener.focus();
  }

  document.addEventListener("click", function (event) {
    const target = event.target.closest("[data-action], [data-navigate]");
    if (!target) return;
    const action = target.getAttribute("data-action");
    if (target.hasAttribute("data-navigate")) {
      FDT.router.navigate(target.getAttribute("data-navigate"));
      return;
    }
    if (action === "open-drawer") {
      FDT.$("#app-shell").classList.add("drawer-open");
      const firstLink = FDT.$(".sidebar .nav-link");
      if (firstLink) firstLink.focus();
    } else if (action === "close-drawer") {
      closeDrawer();
    } else if (action === "toggle-notes") {
      FDT.store.update(function (state) { state.preferences.designNotes = !state.preferences.designNotes; });
      FDT.router.render();
    } else if (action === "navigate-alerts") {
      FDT.router.navigate("/alerts");
    } else if (action === "logout") {
      FDT.store.update(function (state) { state.user = null; });
      FDT.router.navigate("/login");
    }
  });

  document.addEventListener("change", function (event) {
    if (event.target.id === "corridor-select") {
      FDT.store.update(function (state) { state.corridorId = event.target.value; });
      showToast("Corridor changed. The current view has been refreshed.");
      FDT.router.render();
    } else if (event.target.id === "role-select") {
      const role = {
        dispatcher: ["Freight Dispatcher", "Priya Deshmukh"],
        operator: ["Fleet Operator", "Arjun Rao"],
        planner: ["Highway Planner", "Meera Iyer"],
        researcher: ["Researcher / Student", "Kabir Shah"]
      }[event.target.value];
      if (!role) return;
      FDT.store.update(function (state) {
        state.user.role = event.target.value;
        state.user.roleTitle = role[0];
        state.user.name = role[1];
      });
      FDT.router.navigate(roleHomes[event.target.value]);
    }
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeDrawer();
  });

  document.addEventListener("DOMContentLoaded", function () {
    FDT.store.load();
    document.documentElement.dataset.theme = FDT.state.preferences.theme;
    document.body.classList.toggle("wireframe", Boolean(FDT.state.preferences.wireframe));
    if (!window.location.hash) FDT.router.navigate(FDT.state.user ? roleHomes[FDT.state.user.role] || "/dashboard" : "/login");
    else FDT.router.render();
    if (FDT.storageError) showToast("Saved settings could not be read. The prototype is using temporary defaults.");
  });
}());
