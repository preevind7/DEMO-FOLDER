(function () {
  "use strict";
  const FDT = window.FDT = window.FDT || {};
  FDT.pages = FDT.pages || {};
  FDT.pages.alerts = {
    title: "Alerts",
    render: function (root) { FDT.renderPageStub(root, "Alerts", "Review high, moderate and informational corridor alerts."); },
    destroy: function () {}
  };
}());
