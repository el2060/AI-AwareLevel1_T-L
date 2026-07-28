/* Runtime for the static LMS build. Restores the interactions the React app
   provides — quizzes, checklists, explorers, the contents panel and progress —
   without any framework. Answers persist in localStorage under the same key
   prefix the site uses, so a learner's progress carries across the pages. */
(function () {
  "use strict";

  var PREFIX = "ai-tl-level1:";

  function read(key, fallback) {
    try {
      var raw = window.localStorage.getItem(PREFIX + key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (error) {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch (error) {
      /* Private browsing: the session still works, it just will not persist. */
    }
  }

  function payload(id) {
    var tag = document.querySelector('script[data-widget="' + id + '"]');
    return tag ? JSON.parse(tag.textContent) : null;
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  var CHECK =
    '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
  var CROSS =
    '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
  var CHECK_16 = CHECK.replace(/width="14" height="14"/, 'width="16" height="16"');
  var CHECK_15 = CHECK.replace(/width="14" height="14"/, 'width="15" height="15"');

  /* ------------------------------------------------------------- sorters */

  function initSorter(widget) {
    var config = payload(widget.dataset.id);
    if (!config) return;
    var scenarios = config.scenarios;
    var answers = read(config.storageKey, {});
    var tries = {};
    var active = 0;

    var tabs = widget.querySelector('[data-role="tabs"]');
    var caseBox = widget.querySelector('[data-role="case"]');
    var optionBox = widget.querySelector('[data-role="options"]');
    var feedbackBox = widget.querySelector('[data-role="feedback"]');
    var count = widget.querySelector('[data-role="count"]');
    var countNoun = count.textContent.replace(/^\s*\d+\s*\/\s*\d+\s*/, "");

    function render() {
      var current = scenarios[active];
      var picked = answers[current.id];
      var correct = picked === current.answer;
      var reveal = correct || (tries[current.id] || 0) >= 2;

      Array.prototype.forEach.call(tabs.children, function (tab, index) {
        var answer = answers[scenarios[index].id];
        var state = !answer ? "" : answer === scenarios[index].answer ? "solved" : "attempted";
        tab.className = (index === active ? "active " : " ") + state;
        tab.setAttribute("aria-selected", String(index === active));
        tab.innerHTML = answer ? (answer === scenarios[index].answer ? CHECK : CROSS) : String(index + 1);
      });

      caseBox.innerHTML = "";
      caseBox.appendChild(el("p", null, current.context));

      Array.prototype.forEach.call(optionBox.children, function (button) {
        var option = button.dataset.option;
        button.className = picked === option ? (option === current.answer ? "selected correct" : "selected wrong") : "";
      });

      feedbackBox.innerHTML = "";
      if (picked) {
        var box = el("div", "activity-feedback" + (reveal && !correct ? " try-again" : reveal ? "" : " try-again"));
        if (reveal) {
          box.appendChild(el("strong", null, current.answer));
          box.appendChild(el("p", null, current.feedback));
        } else {
          box.appendChild(el("strong", null, "Not quite — try again"));
          box.appendChild(el("p", null, "Re-read the situation and choose another option."));
        }
        feedbackBox.appendChild(box);
      }

      var solved = scenarios.filter(function (scenario) {
        return answers[scenario.id] === scenario.answer;
      }).length;
      count.textContent = solved + " / " + scenarios.length + " " + countNoun;
      count.className = "activity-count" + (solved === scenarios.length ? " complete" : "");
    }

    tabs.addEventListener("click", function (event) {
      var tab = event.target.closest("button[data-index]");
      if (!tab) return;
      active = Number(tab.dataset.index);
      render();
    });

    optionBox.addEventListener("click", function (event) {
      var button = event.target.closest("button[data-option]");
      if (!button) return;
      var current = scenarios[active];
      answers[current.id] = button.dataset.option;
      if (button.dataset.option !== current.answer) tries[current.id] = (tries[current.id] || 0) + 1;
      write(config.storageKey, answers);
      render();
    });

    render();
  }

  /* ---------------------------------------------------------- checklists */

  function initChecklist(widget) {
    var config = payload(widget.dataset.id);
    if (!config) return;
    var notes = read("activity-notes", {});
    var noteKey = config.storageKey.replace("activity-notes:", "");
    var selected = (notes[noteKey] || "").split("|").filter(Boolean);

    var grid = widget.querySelector('[data-role="grid"]');
    var count = widget.querySelector('[data-role="count"]');

    function render() {
      Array.prototype.forEach.call(grid.children, function (button, index) {
        var item = config.items[index];
        var isSelected = selected.indexOf(item) !== -1;
        button.className = isSelected ? "selected" : "";
        var marker = button.querySelector("span");
        marker.innerHTML = isSelected ? CHECK_16 : String(index + 1).padStart(2, "0");
        var body = button.querySelector("div");
        body.innerHTML = "";
        body.appendChild(el("strong", null, item));
        if (isSelected && config.tips[index]) {
          body.appendChild(el("small", "tap-check-tip", config.tips[index]));
        }
      });
      count.textContent = selected.length + " / " + config.items.length;
      count.className = "activity-count" + (selected.length === config.items.length ? " complete" : "");
    }

    grid.addEventListener("click", function (event) {
      var button = event.target.closest("button[data-index]");
      if (!button) return;
      var item = config.items[Number(button.dataset.index)];
      var at = selected.indexOf(item);
      if (at === -1) selected.push(item);
      else selected.splice(at, 1);
      notes[noteKey] = selected.join("|");
      write("activity-notes", notes);
      render();
    });

    render();
  }

  /* ----------------------------------------------------------- next step */

  function initNextStep(widget) {
    var config = payload(widget.dataset.id);
    if (!config) return;
    var notes = read("activity-notes", {});
    var value = notes.nextstep || "";
    var grid = widget.querySelector('[data-role="grid"]');
    var feedbackBox = widget.querySelector('[data-role="feedback"]');

    function render() {
      var chosen = null;
      Array.prototype.forEach.call(grid.children, function (button, index) {
        var option = config.options[index];
        var isSelected = value === option.label;
        if (isSelected) chosen = option;
        button.className = "choice-button" + (isSelected ? " selected" : "");
        button.querySelector("span").innerHTML = isSelected ? CHECK : String.fromCharCode(65 + index);
      });
      feedbackBox.innerHTML = "";
      if (chosen) {
        var box = el("div", "activity-feedback");
        box.appendChild(el("strong", null, "A Practical Place to Start"));
        box.appendChild(el("p", null, chosen.feedback));
        feedbackBox.appendChild(box);
      }
    }

    grid.addEventListener("click", function (event) {
      var button = event.target.closest("button[data-index]");
      if (!button) return;
      value = config.options[Number(button.dataset.index)].label;
      notes.nextstep = value;
      write("activity-notes", notes);
      render();
    });

    render();
  }

  /* -------------------------------------------------------- sense check */

  function initSenseCheck(widget) {
    var config = payload(widget.dataset.id);
    if (!config) return;
    var revealed = read(config.storageKey, []);
    var grid = widget.querySelector('[data-role="grid"]');

    function render() {
      Array.prototype.forEach.call(grid.children, function (button, index) {
        var isRevealed = revealed.indexOf(index) !== -1;
        button.className = isRevealed ? "revealed" : "";
        button.setAttribute("aria-expanded", String(isRevealed));
        var body = button.querySelector("div");
        body.innerHTML = "";
        body.appendChild(el("strong", null, config.items[index].situation));
        if (isRevealed) body.appendChild(el("small", null, config.items[index].reveal));
      });
    }

    grid.addEventListener("click", function (event) {
      var button = event.target.closest("button[data-index]");
      if (!button) return;
      var index = Number(button.dataset.index);
      var at = revealed.indexOf(index);
      if (at === -1) revealed.push(index);
      else revealed.splice(at, 1);
      write(config.storageKey, revealed);
      render();
    });

    render();
  }

  /* ------------------------------------------------------------ pickers */

  function initPressGroup(widget) {
    var group = widget.querySelector('[data-role="group"]');
    if (!group) return;
    group.addEventListener("click", function (event) {
      var button = event.target.closest("button[data-index]");
      if (!button) return;
      Array.prototype.forEach.call(group.children, function (item) {
        var isActive = item === button;
        item.setAttribute("aria-pressed", String(isActive));
        item.className = item.className.replace(/\s*active\b/, "") + (isActive ? " active" : "");
      });
    });
  }

  function initUseCase(widget) {
    var config = payload(widget.dataset.id);
    if (!config) return;
    var picker = widget.querySelector('[data-role="picker"]');
    var detail = widget.querySelector('[data-role="detail"]');

    picker.addEventListener("click", function (event) {
      var button = event.target.closest("button[data-index]");
      if (!button) return;
      var use = config.uses[Number(button.dataset.index)];
      Array.prototype.forEach.call(picker.children, function (item) {
        var isActive = item === button;
        item.setAttribute("aria-pressed", String(isActive));
        item.className = isActive ? "active" : "";
      });
      detail.innerHTML =
        '<div class="use-case-context"><div><strong>Possible approach</strong><p></p></div><div><strong>T&L purpose</strong><p></p></div></div>' +
        '<div class="prompt-starter"><strong>Start here</strong><p></p></div>' +
        '<div class="use-case-checks"><div><b>Check</b><p></p></div><div><b>Your decision</b><p></p></div></div>' +
        '<p class="use-case-tool-note"><strong>Keep the learning purpose in view.</strong> The tool supports the activity; you determine how it is used.</p>';
      var paragraphs = detail.querySelectorAll("p");
      paragraphs[0].textContent = use.tool;
      paragraphs[1].textContent = use.task;
      paragraphs[2].textContent = use.starter;
      paragraphs[3].textContent = use.check;
      paragraphs[4].textContent = use.decision;
    });
  }

  function initTandl(widget) {
    var config = payload(widget.dataset.id);
    if (!config) return;
    var nav = widget.querySelector('[data-role="nav"]');
    var detail = widget.querySelector('[data-role="detail"]');

    nav.addEventListener("click", function (event) {
      var button = event.target.closest("button[data-index]");
      if (!button) return;
      var use = config.uses[Number(button.dataset.index)];
      Array.prototype.forEach.call(nav.children, function (item) {
        var isActive = item === button;
        item.setAttribute("aria-pressed", String(isActive));
        item.className = isActive ? "active" : "";
      });
      detail.innerHTML = "<i>" + use.svg + "</i><div><small>How AI and data can help</small><h3></h3><p></p><strong></strong></div>";
      detail.querySelector("h3").textContent = use.title;
      detail.querySelector("p").textContent = use.detail;
      detail.querySelector("strong").textContent = use.focus;
    });
  }

  /* -------------------------------------------------- progress + contents */

  function initShell() {
    var shell = document.querySelector(".site-shell");
    if (!shell) return;
    var index = Number(shell.dataset.sectionIndex);
    var total = Number(shell.dataset.sectionCount);
    var id = shell.dataset.sectionId;

    // Arriving at a section does not complete it; leaving it forward does,
    // which is how the site counts progress.
    var completed = read("completed-sections", []);

    function persist() {
      write("completed-sections", completed);
    }

    function markComplete() {
      if (completed.indexOf(id) === -1) {
        completed.push(id);
        persist();
      }
    }

    var next = shell.querySelector('[data-role="next"]');
    if (next) next.addEventListener("click", markComplete);

    var finish = shell.querySelector('[data-role="finish"]');
    if (finish) {
      finish.addEventListener("click", function () {
        markComplete();
        paint();
      });
    }

    var progress = shell.querySelector('[data-role="progress"]');
    var completeCount = shell.querySelector('[data-role="complete-count"]');
    var completion = shell.querySelector('[data-role="completion"]');

    function paint() {
      var done = completed.length;
      if (progress) progress.style.width = Math.round((done / total) * 100) + "%";
      if (completeCount) completeCount.textContent = done + " of " + total + " complete";
      if (completion) completion.hidden = !(index === total - 1 && done === total);
      var links = shell.querySelectorAll('[data-role="contents-list"] a');
      Array.prototype.forEach.call(links, function (link) {
        var number = link.querySelector(".contents-number");
        if (completed.indexOf(link.dataset.section) !== -1) {
          number.className = "contents-number done";
          number.innerHTML = CHECK_15;
        } else {
          number.className = "contents-number";
          number.textContent = number.dataset.number;
        }
      });
    }

    var overlay = shell.querySelector('[data-role="contents-overlay"]');
    var openButton = shell.querySelector('[data-role="open-contents"]');
    var closeButton = shell.querySelector('[data-role="close-contents"]');
    var panel = overlay ? overlay.querySelector(".contents-panel") : null;
    var opener = null;

    function focusable() {
      if (!panel) return [];
      return Array.prototype.filter.call(
        panel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'),
        function (node) {
          return !node.hasAttribute("disabled");
        },
      );
    }

    function openContents() {
      opener = document.activeElement;
      overlay.hidden = false;
      openButton.setAttribute("aria-expanded", "true");
      var items = focusable();
      if (items.length) items[0].focus();
      document.addEventListener("keydown", onKeyDown);
    }

    function closeContents() {
      overlay.hidden = true;
      openButton.setAttribute("aria-expanded", "false");
      document.removeEventListener("keydown", onKeyDown);
      if (opener) opener.focus();
    }

    function onKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeContents();
        return;
      }
      if (event.key !== "Tab") return;
      var items = focusable();
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    if (openButton && overlay) {
      openButton.addEventListener("click", openContents);
      closeButton.addEventListener("click", closeContents);
      overlay.addEventListener("click", function (event) {
        if (event.target === overlay) closeContents();
      });
      // Jumping from the contents panel also leaves the current section.
      overlay.addEventListener("click", function (event) {
        if (event.target.closest("a[href]")) markComplete();
      });
    }

    paint();
  }

  var INIT = {
    sorter: initSorter,
    checklist: initChecklist,
    nextstep: initNextStep,
    sense: initSenseCheck,
    "press-group": initPressGroup,
    usecase: initUseCase,
    tandl: initTandl,
  };

  function boot() {
    Array.prototype.forEach.call(document.querySelectorAll(".widget[data-kind]"), function (widget) {
      var init = INIT[widget.dataset.kind];
      if (init) init(widget);
    });
    initShell();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
