(function () {
  "use strict";
  const FDT = window.FDT = window.FDT || {};
  FDT.pages = FDT.pages || {};
  FDT.pages["not-found"] = {
    title: "Page not found",
    render: function (root) {
      root.innerHTML = '<section class="card empty-state"><h1>We could not find that page</h1><p>Check the link or return to your dashboard.</p><a class="button button--primary" href="#/dashboard">Go to dashboard</a></section>';
    },
    destroy: function () {}
  };
}());
