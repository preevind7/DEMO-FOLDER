(function () {
  "use strict";
  const FDT = window.FDT = window.FDT || {};
  FDT.pages = FDT.pages || {};

  const suggestions = [
    "Why is S12 high risk right now?",
    "Should TRK-2041 take the alternate route?",
    "What is the best departure window?",
    "How was the disruption model validated?"
  ];

  function answerFor(question, corridor, params) {
    const text = question.trim();
    const facts = FDT.data.assistantFacts;
    const tripMatch = text.match(/\b(?:TRK|BUS|CAR|VAN)-\d+\b/i);
    const trip = tripMatch && FDT.data.trips.find(function (item) { return item.id.toUpperCase() === tripMatch[0].toUpperCase(); });
    const segmentMatch = text.match(/\b[SC]\d{2}\b/i);
    const requestedSegmentId = params.segment || (segmentMatch && segmentMatch[0]) || (corridor.id === "mumbai-bengaluru" ? "S12" : "C07");
    const segment = FDT.data.segmentById[requestedSegmentId.toUpperCase()];

    if (trip) {
      const currentSegment = FDT.data.segmentById[trip.currentSegment];
      const asksRoute = /rerout|alternate|route|delay|risk/i.test(text);
      const isReferenceTrip = trip.id === "TRK-2041" && asksRoute;
      const status = FDT.state.reroutedTrips.includes(trip.id) ? "Rerouted" : trip.status;
      return {
        text: trip.id + " is " + status.toLowerCase() + " on " + trip.origin + " → " + trip.destination + ", currently on " + trip.currentSegment + (currentSegment ? " (" + currentSegment.name + ")" : "") + ". " +
          (isReferenceTrip
            ? (FDT.state.reroutedTrips.includes(trip.id) ? "The local trip record is already marked rerouted. " : "The reference scenario favors NH48A. ") +
              "It adds " + facts.alternate.extraDistanceKm + " km and estimates " + facts.alternate.delaySavedP50Min + " minutes lower P50 delay. Its illustrative on-time figures are 0% → 93%; the live simulator uses a route-specific delivery buffer and may report a different rate."
            : asksRoute
              ? "Review the current segment forecast and run a simulation before changing the route; this demo does not dispatch vehicles."
              : "This is a synthetic trip record; use the trip detail screen to review its timeline."),
        source: isReferenceTrip ? "TRK-2041 reference scenario · synthetic route comparison" : trip.id + " trip record · synthetic fleet data",
        href: isReferenceTrip ? "#/library" : "#/trip/" + encodeURIComponent(trip.id),
        action: isReferenceTrip ? "Review saved scenarios" : "Open trip"
      };
    }

    if (/departure|leave|when should|best time|best window/i.test(text)) {
      return {
        text: "The prototype's departure reference identifies " + facts.departure.bestHour + " as the best window, with an estimated " + facts.departure.expectedDelayMin + "-minute delay and " + facts.departure.onTimePercent + "% on-time probability. These are synthetic planning values, not a live forecast; compare the corridor and vehicle in the Departure Planner.",
        source: "Synthetic departure-planning benchmark",
        href: "#/departure",
        action: "Open Departure Planner"
      };
    }

    if (/model|validat|accuracy|auc|coverage|rare event/i.test(text)) {
      return {
        text: "On the synthetic validation benchmark, disruption-risk ROC-AUC is " + facts.model.rocAuc.toFixed(3) + " and PR-AUC is " + facts.model.prAuc.toFixed(3) + ". P90 uncertainty coverage is " + Math.round(facts.model.p90Coverage * 100) + "%. Rare disruption events make up " + facts.model.rareEventPercent + "% of the benchmark, so these results should not be treated as production performance.",
        source: "Model metrics and synthetic validation split",
        href: "#/model",
        action: "View model metrics"
      };
    }

    if (/alternate|nh48a|rerout|route comparison|route option/i.test(text) && corridor.alternateRoute) {
      return {
        text: corridor.alternateRoute.name + " is the reference alternative: it adds " + facts.alternate.extraDistanceKm + " km and saves an estimated " + facts.alternate.delaySavedP50Min + " minutes at P50. The reference example lists on-time probability as 0% → 93%; live simulations calculate on-time rates against each route's travel-time buffer, so run the simulator for a fresh estimate.",
        source: "Synthetic route comparison reference",
        href: "#/simulator?segment=" + encodeURIComponent(segment && segment.corridorId === corridor.id ? segment.id : "S12"),
        action: "Run a simulation"
      };
    }

    if (/risk|rain|flood|threshold|why|segment|forecast|s\d{1,2}|c\d{1,2}/i.test(text)) {
      if (!segment || segment.corridorId !== corridor.id) {
        return {
          text: "I couldn't find that segment on " + corridor.name + ". Choose a segment from this corridor's risk map, or ask about " + (corridor.id === "mumbai-bengaluru" ? "S12" : "C07") + ".",
          source: "Corridor segment catalogue",
          href: "#/risk-map",
          action: "Open Corridor Risk Map"
        };
      }
      const hour = 10;
      const risk = segment.risk[hour];
      const rainfall = segment.rainMmHr[hour];
      const probability = segment.rainProbability[hour];
      const cause = rainfall >= segment.floodThresholdMmHr ? "Forecast rainfall is above the segment's flood threshold." :
        risk >= 0.6 ? "The segment's forecast danger score is high even though rainfall is below its flood threshold." :
          "The current segment danger score is not in the high-risk band.";
      return {
        text: segment.id + " (" + segment.name + ") has a danger score of " + risk.toFixed(2) + " at 10:00 IST. Forecast rain is " + rainfall + " mm/hr versus a " + segment.floodThresholdMmHr + " mm/hr threshold, with " + Math.round(probability * 100) + "% rain probability. " + cause + " These are synthetic segment forecasts.",
        source: segment.id + " hourly risk and rainfall forecast · 10:00 IST",
        href: "#/segment/" + encodeURIComponent(segment.id),
        action: "Open segment details"
      };
    }

    return {
      text: "I can answer questions about corridor segment risk and rain, active trips, the reference reroute, departure planning, and synthetic model metrics. Try one of the suggested questions; I will show the data source used.",
      source: "Prototype assistant capabilities",
      href: "#/guide",
      action: "Read the Prototype Guide"
    };
  }

  function addMessage(log, role, content) {
    const message = document.createElement("article");
    message.className = "assistant-message assistant-message--" + role;
    message.setAttribute("aria-label", role === "user" ? "Your question" : "Assistant response");
    const label = document.createElement("span");
    label.className = "assistant-message__label";
    label.textContent = role === "user" ? "You" : "Freight Twin Assistant · Demo";
    const body = document.createElement("p");
    body.className = "assistant-message__body";
    body.textContent = content;
    message.append(label, body);
    log.append(message);
    return message;
  }

  function render(root, params) {
    params = params || {};
    const corridor = FDT.data.getCorridor(FDT.state.corridorId);
    const initialQuery = params.q || "";
    const segment = params.segment && FDT.data.segmentById[params.segment.toUpperCase()];
    const contextLabel = segment && segment.corridorId === corridor.id ? segment.id + " · " + segment.name : corridor.name;
    root.innerHTML =
      '<header class="page-heading"><div><p class="small muted">SYNTHETIC DATA · BROWSER-ONLY DEMO</p><h1>GenAI Assistant</h1><p>Ask about corridor risk, trips, reroutes, departure windows, or model validation.</p></div><div class="page-actions"><a class="button" href="#/dashboard">Back to dashboard</a></div></header>' +
      '<div class="assistant-demo-notice" role="note"><strong>Prototype assistant</strong><span>Answers are template-based and grounded in local synthetic data. No external AI service is connected; verify decisions in the source screens.</span></div>' +
      '<div class="assistant-layout"><section class="card assistant-chat-card" aria-label="Assistant conversation"><div class="card__header"><div><h2>Conversation</h2><p>Context: ' + FDT.escapeHtml(contextLabel) + '</p></div><button class="button button--subtle" type="button" id="assistant-clear">Clear chat</button></div>' +
      '<div class="assistant-chat-log" id="assistant-chat-log" role="log" aria-live="polite" aria-relevant="additions text"><article class="assistant-message assistant-message--assistant"><span class="assistant-message__label">Freight Twin Assistant · Demo</span><p class="assistant-message__body">Hi ' + FDT.escapeHtml(FDT.state.user.name.split(/\s+/)[0]) + '. Ask a question about this corridor. I will show the synthetic data source behind each answer.</p><span class="assistant-source">Context: ' + FDT.escapeHtml(contextLabel) + '</span></article></div>' +
      '<form class="assistant-composer" id="assistant-form"><label class="sr-only" for="assistant-question">Ask the assistant a question</label><textarea id="assistant-question" rows="2" maxlength="500" placeholder="Ask about risk, a trip, or a route..." required>' + FDT.escapeHtml(initialQuery) + '</textarea><button type="submit" class="button button--primary">Ask</button></form><p class="assistant-composer-hint">Enter to send · Shift+Enter for a new line · 500 characters max</p></section>' +
      '<aside class="card assistant-prompts"><div class="card__header"><div><h2>Try asking</h2><p>Example questions use this prototype’s local data.</p></div></div><div class="assistant-prompt-list">' +
      suggestions.map(function (suggestion) { return '<button type="button" class="assistant-prompt" data-prompt="' + FDT.escapeHtml(suggestion) + '">' + FDT.escapeHtml(suggestion) + '</button>'; }).join("") +
      '</div><div class="assistant-source-note"><strong>Grounding</strong><p>Each response includes a source link. Synthetic benchmark figures are illustrative and are not operational forecasts.</p></div></aside></div>';

    const log = FDT.$("#assistant-chat-log", root);
    const form = FDT.$("#assistant-form", root);
    const questionField = FDT.$("#assistant-question", root);
    function submitQuestion(question) {
      const text = question.trim();
      if (!text) {
        questionField.setCustomValidity("Enter a question before sending.");
        questionField.reportValidity();
        return;
      }
      questionField.setCustomValidity("");
      addMessage(log, "user", text);
      const answer = answerFor(text, corridor, params);
      const response = addMessage(log, "assistant", answer.text);
      const source = document.createElement("a");
      source.className = "assistant-source";
      source.href = answer.href;
      source.textContent = "Source: " + answer.source;
      response.append(source);
      const action = document.createElement("a");
      action.className = "button button--subtle assistant-response-action";
      action.href = answer.href;
      action.textContent = answer.action;
      response.append(action);
      questionField.value = "";
      response.scrollIntoView({ block: "nearest" });
      questionField.focus();
    }
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      submitQuestion(questionField.value);
    });
    questionField.addEventListener("keydown", function (event) {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        form.requestSubmit();
      }
    });
    root.querySelectorAll("[data-prompt]").forEach(function (button) {
      button.addEventListener("click", function () {
        questionField.value = button.getAttribute("data-prompt");
        form.requestSubmit();
      });
    });
    FDT.$("#assistant-clear", root).addEventListener("click", function () {
      log.replaceChildren();
      const welcome = addMessage(log, "assistant", "Chat cleared. Ask a question about the current corridor to get started.");
      const context = document.createElement("span");
      context.className = "assistant-source";
      context.textContent = "Context: " + contextLabel;
      welcome.append(context);
      questionField.focus();
    });
    if (initialQuery) form.requestSubmit();
  }

  FDT.pages.assistant = {
    title: "GenAI Assistant",
    render: render,
    destroy: function () {}
  };
}());
