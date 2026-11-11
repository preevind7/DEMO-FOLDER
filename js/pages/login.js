(function () {
  "use strict";
  const FDT = window.FDT = window.FDT || {};
  const roles = [
    { id: "dispatcher", title: "Freight Dispatcher", person: "Priya Deshmukh", icon: "truck", description: "Monitor corridor risk and reroute active trips." },
    { id: "operator", title: "Fleet Operator", person: "Arjun Rao", icon: "fleet", description: "Plan departures and keep vehicles moving." },
    { id: "planner", title: "Highway Planner", person: "Meera Iyer", icon: "map", description: "Find highway hotspots and plan interventions." },
    { id: "researcher", title: "Researcher / Student", person: "Kabir Shah", icon: "chart", description: "Explore model performance and validation." }
  ];

  FDT.pages = FDT.pages || {};
  FDT.pages.login = {
    title: "Choose your role",
    render: function (root) {
      root.innerHTML = [
        '<section class="login-page" aria-label="Sign in to Freight Disruption Digital Twin">',
        '  <div class="login-intro">',
        '    <div class="login-brand"><span class="login-brand__mark" aria-hidden="true">AI</span><span>Freight Disruption Digital Twin</span></div>',
        '    <h1>See disruption before it reaches your fleet.</h1>',
        '    <p class="login-intro__tagline">Forecasting highway disruption in India for every vehicle on the road: trucks, buses, cars/taxis and vans.</p>',
        '    <div class="journey-strip" aria-label="Predict, test, explain, act"><span>Predict</span><b aria-hidden="true">→</b><span>Test</span><b aria-hidden="true">→</b><span>Explain</span><b aria-hidden="true">→</b><span>Act</span></div>',
        '  </div>',
        '  <div class="login-panel"><form class="login-card" id="login-form">',
        '    <h2>Choose your role</h2><p>Your role sets the screens you see first.</p>',
        '    <div class="role-list" role="radiogroup" aria-label="Your role">',
        roles.map(function (role, index) {
          return '<label class="role-option"><input type="radio" name="role" value="' + role.id + '"' + (index === 0 ? " checked" : "") + '><span class="role-option__icon" aria-hidden="true">' + FDT.icon(role.icon) + '</span><span class="role-option__copy"><strong>' + role.title + '</strong><small>' + role.description + '</small></span></label>';
        }).join(""),
        '    </div>',
        '    <div class="field"><label for="login-name">Your name</label><input id="login-name" name="name" autocomplete="name" required value="Priya Deshmukh"></div>',
        '    <button class="button button--primary button--wide" type="submit" style="margin-top:18px">Continue <span aria-hidden="true">→</span></button>',
        '    <p class="login-note">No password needed – prototype. This demo uses synthetic data only.</p>',
        '  </form></div>',
        '</section>'
      ].join("");

      const form = FDT.$("#login-form", root);
      const nameField = FDT.$("#login-name", form);
      form.addEventListener("change", function (event) {
        if (event.target.name !== "role") return;
        const selected = roles.find(function (role) { return role.id === event.target.value; });
        if (selected) nameField.value = selected.person;
      });
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        const selected = roles.find(function (role) { return role.id === new FormData(form).get("role"); });
        if (!selected) return;
        FDT.store.update(function (state) {
          state.user = { role: selected.id, roleTitle: selected.title, name: nameField.value.trim() || selected.person };
        });
        const home = { dispatcher: "dashboard", operator: "vehicles", planner: "hotspots", researcher: "model" }[selected.id];
        FDT.router.navigate("/" + home);
      });
    },
    destroy: function () {}
  };
}());
