/* ============================================================
   Humanos System-Flow Animation — v2 (Recover + Continue)
   ------------------------------------------------------------
   25s loop, single time cursor 0..1.
   0.0 - 0.40 (10s)  full flow w/ recovery branch
   0.40 - 1.00 (15s) static hold w/ rotating overlay messages

   Phases (mapped to shots):
     01 idle               (0.00 - 0.04)
     02 prepare            (0.04 - 0.08)   agent lights, payload chip
     03 verify             (0.08 - 0.13)   agent → verify line; chips
     04 decision split     (0.13 - 0.18)   block branch ghosts
     05 recovery: request  (0.18 - 0.22)   verify → user (pulse)
     06 recovery: collect  (0.22 - 0.26)   approval / KYC card
     07 mandate update     (0.26 - 0.30)   user → mandate
     08 re-verify          (0.30 - 0.34)   loop back, allow now lights
     09 execute            (0.34 - 0.37)   allow → execute
     10 proof              (0.37 - 0.40)   execute → proof + stamp
     HOLD                  (0.40 - 1.00)   final state w/ glow + msgs
   ============================================================ */
(function () {
  "use strict";

  const ROOT = document.getElementById("flow-animation");
  if (!ROOT) return;

  const shotEls = Array.from(
    document.querySelectorAll(".animation-shots .shot"),
  );

  const DURATION = 35000; // 35s loop (40% slower than original 25s)
  const HOLD_START = 0.4;

  const SHOTS = [
    { id: "idle", start: 0.0, end: 0.04, label: "00 · idle" },
    {
      id: "prepare",
      start: 0.04,
      end: 0.08,
      label: "01 · agent prepares action",
    },
    { id: "verify", start: 0.08, end: 0.13, label: "02 · humanos.verify(...)" },
    {
      id: "decide",
      start: 0.13,
      end: 0.18,
      label: "03 · decision · not authorized",
    },
    {
      id: "request",
      start: 0.18,
      end: 0.22,
      label: "04 · request approval / kyc",
    },
    {
      id: "collect",
      start: 0.22,
      end: 0.26,
      label: "05 · approval / kyc collected",
    },
    { id: "update", start: 0.26, end: 0.3, label: "06 · mandate updated" },
    {
      id: "reverify",
      start: 0.3,
      end: 0.34,
      label: "07 · re-verify · authorized",
    },
    { id: "execute", start: 0.34, end: 0.37, label: "08 · execute" },
    { id: "proof", start: 0.37, end: 0.4, label: "09 · proof generated" },
    {
      id: "hold",
      start: 0.4,
      end: 1.0,
      label: "10 · execution complete · verified",
    },
  ];

  const NS = "http://www.w3.org/2000/svg";
  const VW = 1200,
    VH = 520;
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", `0 0 ${VW} ${VH}`);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.setAttribute("overflow", "visible");
  svg.setAttribute("class", "flow-svg");
  svg.setAttribute("aria-label", "Humanos verify-recover-execute system flow");
  ROOT.appendChild(svg);

  const defs = document.createElementNS(NS, "defs");
  defs.innerHTML = `
    <pattern id="hm-grid" width="24" height="24" patternUnits="userSpaceOnUse">
      <path d="M0 .5H24" fill="none" stroke="rgba(17,17,17,0.05)" stroke-width="0.6"/>
      <path d="M.5 0V24" fill="none" stroke="rgba(17,17,17,0.05)" stroke-width="0.6"/>
    </pattern>
    <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="rgba(17,17,17,0.55)"/>
    </marker>
    <marker id="arr-indigo" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="#4b49ca"/>
    </marker>
    <marker id="arr-rose" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M0 0 L10 5 L0 10 Z" fill="#F3797E"/>
    </marker>
    <radialGradient id="glow-indigo" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#4b49ca" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#4b49ca" stop-opacity="0"/>
    </radialGradient>
  `;
  svg.appendChild(defs);

  function el(tag, attrs, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    (parent || svg).appendChild(n);
    return n;
  }
  function group(attrs, parent) {
    return el("g", attrs, parent);
  }
  function text(x, y, str, attrs, parent) {
    const t = el("text", Object.assign({ x, y }, attrs || {}), parent);
    t.textContent = str;
    return t;
  }

  // ---- positions -----------------------------------------------
  const POS = {
    agent: { x: 60, y: 180, w: 140, h: 76 },
    verify: { x: 280, y: 180, w: 170, h: 76 },
    mandate: { x: 510, y: 180, w: 200, h: 76 },
    allow: { x: 770, y: 130, w: 130, h: 60 },
    block: { x: 770, y: 246, w: 130, h: 60 },
    execute: { x: 950, y: 130, w: 130, h: 60 },
    proof: { x: 1120, y: 130, w: 60, h: 60 }, // small chip — adjusted
    user: { x: 525, y: 360, w: 170, h: 70 }, // recovery — sits below mandate
  };
  // proof chip — keep within viewBox; resize:
  POS.proof = { x: 1095, y: 130, w: 85, h: 60 };

  // partners along far right column
  const PARTNERS = [
    { id: "p1", label: "Custodian", x: 1130, y: 280 },
    { id: "p2", label: "Auditor", x: 1130, y: 330 },
    { id: "p3", label: "Partner", x: 1130, y: 380 },
  ];

  // ---- helpers -------------------------------------------------
  function rightEdge(p) {
    return { x: p.x + p.w, y: p.y + p.h / 2 };
  }
  function leftEdge(p) {
    return { x: p.x, y: p.y + p.h / 2 };
  }
  function bottomEdge(p) {
    return { x: p.x + p.w / 2, y: p.y + p.h };
  }
  function topEdge(p) {
    return { x: p.x + p.w / 2, y: p.y };
  }

  function nodeBox(id, p, label, sub, opts) {
    opts = opts || {};
    const g = group({ class: "node", "data-node": id });
    el(
      "rect",
      {
        x: p.x,
        y: p.y,
        width: p.w,
        height: p.h,
        rx: 2,
        ry: 2,
        fill: "#FFFFFF",
        stroke: "rgba(17,17,17,0.18)",
        "stroke-width": 1,
        class: "node-box",
      },
      g,
    );
    text(
      p.x + 14,
      p.y + 24,
      label,
      {
        "font-family": "Inter, sans-serif",
        "font-size": 13.5,
        "font-weight": 600,
        fill: "#111",
        class: "node-label",
      },
      g,
    );
    if (sub) {
      text(
        p.x + 14,
        p.y + 44,
        sub,
        {
          "font-family": "JetBrains Mono, monospace",
          "font-size": 10.5,
          fill: "rgba(17,17,17,0.55)",
          class: "node-sub",
        },
        g,
      );
    }
    if (
      opts.kind === "allow" ||
      opts.kind === "execute" ||
      opts.kind === "proof"
    ) {
      el(
        "circle",
        {
          cx: p.x + p.w - 12,
          cy: p.y + 12,
          r: 4,
          fill: "#4b49ca",
          class: "node-pin",
          opacity: 0.18,
        },
        g,
      );
    } else if (opts.kind === "block") {
      el(
        "circle",
        {
          cx: p.x + p.w - 12,
          cy: p.y + 12,
          r: 4,
          fill: "#F3797E",
          class: "node-pin",
          opacity: 0.18,
        },
        g,
      );
    }
    return g;
  }

  // glow halos (under nodes; kept dim until lit)
  function glow(p, color) {
    const c = color || "#4b49ca";
    const cx = p.x + p.w / 2,
      cy = p.y + p.h / 2,
      r = Math.max(p.w, p.h);
    return el("circle", {
      cx,
      cy,
      r,
      fill: "url(#glow-indigo)",
      opacity: 0,
      class: "glow",
    });
  }

  const glowVerify = glow(POS.verify);
  const glowProof = glow(POS.proof);
  const glowExecute = glow(POS.execute);

  // node frames
  const nAgent = nodeBox("agent", POS.agent, "Agent", "prepares action");
  const nVerify = nodeBox(
    "verify",
    POS.verify,
    "verify()",
    "humanos.verify(...)",
  );
  const nMandate = nodeBox(
    "mandate",
    POS.mandate,
    "Mandate",
    "subject · scope · limits",
  );
  const nAllow = nodeBox("allow", POS.allow, "Allow", "within scope", {
    kind: "allow",
  });
  const nBlock = nodeBox("block", POS.block, "Not auth", "recover", {
    kind: "block",
  });
  const nExecute = nodeBox("execute", POS.execute, "Execute", "venue / rail", {
    kind: "execute",
  });
  const nProof = nodeBox("proof", POS.proof, "Proof", "receipt", {
    kind: "proof",
  });
  const nUser = nodeBox("user", POS.user, "User", "approve · kyc");

  // partner chips
  const partnerEls = PARTNERS.map((p) => {
    const g = group({ class: "partner", "data-id": p.id });
    el(
      "rect",
      {
        x: p.x - 50,
        y: p.y - 14,
        width: 100,
        height: 28,
        rx: 2,
        ry: 2,
        fill: "#FFFFFF",
        stroke: "rgba(17,17,17,0.18)",
        class: "partner-box",
      },
      g,
    );
    text(
      p.x,
      p.y + 4,
      p.label,
      {
        "text-anchor": "middle",
        "font-family": "Inter, sans-serif",
        "font-size": 11.5,
        "font-weight": 500,
        fill: "#111",
        class: "partner-label",
      },
      g,
    );
    g.style.opacity = 0.3;
    return g;
  });

  // payload chip (appears on prepare)
  const payloadG = group({ class: "payload", opacity: 0 });
  el(
    "rect",
    {
      x: POS.agent.x,
      y: POS.agent.y - 70,
      width: 200,
      height: 56,
      rx: 2,
      ry: 2,
      fill: "#111",
      stroke: "none",
    },
    payloadG,
  );
  const pT = (line, dy) =>
    text(
      POS.agent.x + 10,
      POS.agent.y - 70 + dy,
      line,
      {
        "font-family": "JetBrains Mono, monospace",
        "font-size": 10,
        fill: "#F4F3EF",
      },
      payloadG,
    );
  pT('action: "reallocate_capital"', 16);
  pT("amount: 50000", 30);
  pT('strategy: "delta_neutral"', 44);

  // verify chips (identity/constraints/validity/revocation)
  const chipsG = group({ class: "verify-chips", opacity: 0 });
  const chipLabels = ["identity", "constraints", "validity", "revocation"];
  chipLabels.forEach((c, i) => {
    const cx = POS.verify.x + 6 + i * 42,
      cy = POS.verify.y + POS.verify.h + 14;
    // chip width is variable but centered grouping; use simple positions
  });
  // Better: lay out chips as a row below verify
  (function layoutChips() {
    const startY = POS.verify.y + POS.verify.h + 12;
    let x = POS.verify.x;
    chipLabels.forEach((c) => {
      const w = c.length * 6.5 + 18;
      const g = group({ class: "verify-chip" }, chipsG);
      el(
        "rect",
        {
          x,
          y: startY,
          width: w,
          height: 22,
          rx: 2,
          ry: 2,
          fill: "#F4F3EF",
          stroke: "rgba(17,17,17,0.15)",
        },
        g,
      );
      text(
        x + 9,
        startY + 15,
        c,
        {
          "font-family": "JetBrains Mono, monospace",
          "font-size": 10,
          fill: "rgba(17,17,17,0.7)",
        },
        g,
      );
      x += w + 6;
    });
  })();

  // approval card (appears during collect) — sits to the LEFT of the user card
  const approvalG = group({ class: "approval", opacity: 0 });
  const APPROVAL_W = 220;
  const APPROVAL_X = POS.user.x - 18 - APPROVAL_W;
  el(
    "rect",
    {
      x: APPROVAL_X,
      y: POS.user.y - 14,
      width: APPROVAL_W,
      height: 96,
      rx: 3,
      ry: 3,
      fill: "#FFFFFF",
      stroke: "rgba(17,17,17,0.18)",
    },
    approvalG,
  );
  text(
    APPROVAL_X + 14,
    POS.user.y + 6,
    "Approve action",
    {
      "font-family": "Inter, sans-serif",
      "font-size": 12,
      "font-weight": 600,
      fill: "#111",
    },
    approvalG,
  );
  text(
    APPROVAL_X + 14,
    POS.user.y + 24,
    "Identity verification",
    {
      "font-family": "Inter, sans-serif",
      "font-size": 11,
      fill: "rgba(17,17,17,0.55)",
    },
    approvalG,
  );
  // checkmark badge
  const BADGE_X = APPROVAL_X + 14;
  const BADGE_Y = POS.user.y + 38;
  const BADGE_W = 80;
  const BADGE_H = 24;
  el(
    "rect",
    {
      x: BADGE_X,
      y: BADGE_Y,
      width: BADGE_W,
      height: BADGE_H,
      rx: 12,
      ry: 12,
      fill: "#4b49ca",
      stroke: "none",
    },
    approvalG,
  );
  text(
    BADGE_X + BADGE_W / 2,
    BADGE_Y + BADGE_H / 2,
    "✓ collected",
    {
      "text-anchor": "middle",
      "dominant-baseline": "central",
      "font-family": "Inter, sans-serif",
      "font-size": 11,
      "font-weight": 600,
      fill: "#F4F3EF",
    },
    approvalG,
  );

  // proof stamp
  const proofStamp = group({ class: "proof-stamp", opacity: 0 });
  el(
    "rect",
    {
      x: POS.proof.x - 4,
      y: POS.proof.y + POS.proof.h + 10,
      width: 92,
      height: 22,
      rx: 1,
      ry: 1,
      fill: "#111",
      stroke: "none",
    },
    proofStamp,
  );
  text(
    POS.proof.x + 2,
    POS.proof.y + POS.proof.h + 25,
    "0xA13F · proof",
    {
      "font-family": "JetBrains Mono, monospace",
      "font-size": 10,
      fill: "#F4F3EF",
    },
    proofStamp,
  );

  // pulse ring (used on user node during request)
  const pulseG = group({ class: "pulse-g", opacity: 0 });
  const pulse = el(
    "circle",
    {
      cx: POS.user.x + POS.user.w / 2,
      cy: POS.user.y + POS.user.h / 2,
      r: 18,
      fill: "none",
      stroke: "#4b49ca",
      "stroke-width": 1.4,
      opacity: 1,
    },
    pulseG,
  );

  // verify-tick on Allow
  const tickG = group({ class: "tick-g" });
  const tickPath = el(
    "path",
    {
      d: `M ${POS.allow.x + POS.allow.w - 36} ${POS.allow.y + 32}
        l 8 8
        l 18 -18`,
      fill: "none",
      stroke: "#4b49ca",
      "stroke-width": 2.2,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    },
    tickG,
  );
  const tickLen = tickPath.getTotalLength();
  tickPath.setAttribute("stroke-dasharray", tickLen);
  tickPath.setAttribute("stroke-dashoffset", tickLen);

  // ---- connectors ---------------------------------------------
  function drawCurve(from, to, opts) {
    opts = opts || {};
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    let c1, c2;
    if (Math.abs(dx) > Math.abs(dy)) {
      c1 = { x: from.x + dx * 0.5, y: from.y };
      c2 = { x: from.x + dx * 0.5, y: to.y };
    } else {
      c1 = { x: from.x, y: from.y + dy * 0.5 };
      c2 = { x: to.x, y: from.y + dy * 0.5 };
    }
    if (opts.bow) {
      const norm = Math.hypot(dx, dy) || 1;
      const px = -dy / norm;
      const py = dx / norm;
      c1.x += px * opts.bow;
      c1.y += py * opts.bow;
      c2.x += px * opts.bow;
      c2.y += py * opts.bow;
    }
    const d = `M ${from.x} ${from.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${to.x} ${to.y}`;
    const path = el("path", {
      d,
      fill: "none",
      stroke: opts.stroke || "rgba(17,17,17,0.55)",
      "stroke-width": opts.w || 1.4,
      class: opts.cls || "flow-line",
    });
    if (opts.dashed) path.setAttribute("stroke-dasharray", "4 4");
    const len = path.getTotalLength();
    if (!opts.dashed) {
      path.setAttribute("stroke-dasharray", len);
      path.setAttribute("stroke-dashoffset", len);
    }
    path._len = len;
    path._dashed = !!opts.dashed;
    path._marker = opts.marker || "url(#arr)";
    return path;
  }

  // Orthogonal L-shape connector with a small rounded corner.
  // Goes vertical first by default (corner at from.x, to.y), then horizontal.
  function drawOrtho(from, to, opts) {
    opts = opts || {};
    const r = opts.radius || 12;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const verticalFirst = opts.verticalFirst !== false;
    const xDir = Math.sign(dx) || 1;
    const yDir = Math.sign(dy) || 1;

    let d;
    if (verticalFirst) {
      const corner = { x: from.x, y: to.y };
      const before = { x: from.x, y: to.y - yDir * r };
      const after = { x: from.x + xDir * r, y: to.y };
      d = `M ${from.x} ${from.y} L ${before.x} ${before.y} Q ${corner.x} ${corner.y} ${after.x} ${after.y} L ${to.x} ${to.y}`;
    } else {
      const corner = { x: to.x, y: from.y };
      const before = { x: to.x - xDir * r, y: from.y };
      const after = { x: to.x, y: from.y + yDir * r };
      d = `M ${from.x} ${from.y} L ${before.x} ${before.y} Q ${corner.x} ${corner.y} ${after.x} ${after.y} L ${to.x} ${to.y}`;
    }

    const path = el("path", {
      d,
      fill: "none",
      stroke: opts.stroke || "rgba(17,17,17,0.55)",
      "stroke-width": opts.w || 1.4,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      class: opts.cls || "flow-line",
    });
    if (opts.dashed) path.setAttribute("stroke-dasharray", "5 4");
    const len = path.getTotalLength();
    if (!opts.dashed) {
      path.setAttribute("stroke-dasharray", len);
      path.setAttribute("stroke-dashoffset", len);
    }
    path._len = len;
    path._dashed = !!opts.dashed;
    path._marker = opts.marker || "url(#arr)";
    return path;
  }

  // main flow
  const lAgentVerify = drawCurve(rightEdge(POS.agent), leftEdge(POS.verify));
  const lVerifyMandate = drawCurve(
    rightEdge(POS.verify),
    leftEdge(POS.mandate),
  );
  const lMandateBlock = drawCurve(rightEdge(POS.mandate), leftEdge(POS.block), {
    stroke: "#F3797E",
    marker: "url(#arr-rose)",
  });
  const lAllowExec = drawCurve(rightEdge(POS.allow), leftEdge(POS.execute), {
    stroke: "#4b49ca",
    marker: "url(#arr-indigo)",
  });
  const lExecProof = drawCurve(rightEdge(POS.execute), leftEdge(POS.proof), {
    stroke: "#4b49ca",
    marker: "url(#arr-indigo)",
  });

  // recovery loop — orthogonal dashed routing
  // Block → User: down from bottom of block, right-angle corner, into right side of user
  const lBlockUser = drawOrtho(bottomEdge(POS.block), rightEdge(POS.user), {
    stroke: "#F3797E",
    marker: "url(#arr-rose)",
    dashed: true,
  });
  // User → Allow: up from top-right of user (clears the verify chips row), right-angle corner, into left side of allow
  const lUserMandate = drawOrtho(
    { x: POS.user.x + 125, y: POS.user.y },
    leftEdge(POS.allow),
    {
      stroke: "#4b49ca",
      marker: "url(#arr-indigo)",
      dashed: true,
    },
  );
  // Verify ↻ self-loop drawn during reverify shot

  // proof → partners — out the right side of proof, arching right, into the right side of each partner card
  const lShare = PARTNERS.map((p) =>
    drawCurve(
      rightEdge(POS.proof),
      { x: p.x + 50, y: p.y },
      {
        stroke: "rgba(75,73,202,0.5)",
        marker: "url(#arr-indigo)",
        w: 1,
        bow: -50,
      },
    ),
  );

  // ---- annotations + overlay ----------------------------------
  const annoG = group({ class: "annotations" });
  const annoLabel = text(
    VW / 2,
    36,
    "",
    {
      "text-anchor": "middle",
      "font-family": "JetBrains Mono, monospace",
      "font-size": 12,
      "letter-spacing": 1,
      fill: "rgba(17,17,17,0.65)",
      class: "anno-label",
    },
    annoG,
  );

  // ---- helpers -------------------------------------------------
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeInOut = (t) =>
    t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  function localT(now, shot) {
    const t = (now - shot.start) / (shot.end - shot.start);
    return Math.max(0, Math.min(1, t));
  }
  function isActive(now, shot) {
    return now >= shot.start && now <= shot.end + 0.0001;
  }
  function isPast(now, shot) {
    return now > shot.end;
  }

  function setMarker(path, on) {
    if (on) path.setAttribute("marker-end", path._marker);
    else path.removeAttribute("marker-end");
  }
  function setLine(path, p) {
    if (path._dashed) {
      path.setAttribute("opacity", p);
      setMarker(path, p >= 0.999);
      return;
    }
    const len = path._len;
    path.setAttribute("stroke-dashoffset", len * (1 - p));
    setMarker(path, p >= 0.999);
  }
  function setLineFull(path, on) {
    if (path._dashed) {
      path.setAttribute("opacity", on ? 1 : 0);
      setMarker(path, on);
      return;
    }
    path.setAttribute("stroke-dashoffset", on ? 0 : path._len);
    setMarker(path, on);
  }
  function setActive(node, on) {
    if (!node) return;
    const box = node.querySelector(".node-box");
    const pin = node.querySelector(".node-pin");
    if (on) {
      box.setAttribute("stroke", "#111");
      box.setAttribute("stroke-width", 1.5);
      if (pin) pin.setAttribute("opacity", 1);
    } else {
      box.setAttribute("stroke", "rgba(17,17,17,0.18)");
      box.setAttribute("stroke-width", 1);
      if (pin) pin.setAttribute("opacity", 0.18);
    }
  }

  // ---- render --------------------------------------------------
  function render(now /* 0..1 */) {
    // reset everything
    [
      nAgent,
      nVerify,
      nMandate,
      nAllow,
      nBlock,
      nExecute,
      nProof,
      nUser,
    ].forEach((n) => setActive(n, false));
    [
      lAgentVerify,
      lVerifyMandate,
      lMandateBlock,
      lAllowExec,
      lExecProof,
      lBlockUser,
      lUserMandate,
    ].forEach((l) => setLineFull(l, false));
    lShare.forEach((l) => setLineFull(l, false));
    proofStamp.setAttribute("opacity", 0);
    payloadG.setAttribute("opacity", 0);
    chipsG.setAttribute("opacity", 0);
    approvalG.setAttribute("opacity", 0);
    pulseG.setAttribute("opacity", 0);
    glowVerify.setAttribute("opacity", 0);
    glowProof.setAttribute("opacity", 0);
    glowExecute.setAttribute("opacity", 0);
    tickPath.setAttribute("stroke-dashoffset", tickLen);
    partnerEls.forEach((g) => (g.style.opacity = 0.3));
    svg.style.opacity = 1;

    const active = SHOTS.find((s) => isActive(now, s)) || SHOTS[0];
    annoLabel.textContent = active.label;

    // highlight the matching step in the bottom strip
    shotEls.forEach((el) => {
      const ids = (el.dataset.shot || "").split(/\s+/).filter(Boolean);
      el.classList.toggle("is-active", ids.includes(active.id));
    });

    // Past states
    const past = (id) => {
      const s = SHOTS.find((x) => x.id === id);
      return s && now > s.end;
    };
    const onOrPast = (id) => {
      const s = SHOTS.find((x) => x.id === id);
      return s && now >= s.start;
    };

    // ---- prepare ----
    if (onOrPast("prepare")) {
      setActive(nAgent, true);
      const s = SHOTS.find((x) => x.id === "prepare");
      const t = isActive(now, s) ? easeOut(localT(now, s)) : 1;
      payloadG.setAttribute("opacity", t);
    }

    // ---- verify (line draws + verify lights + chips appear) ----
    if (onOrPast("verify")) {
      const s = SHOTS.find((x) => x.id === "verify");
      const t = isActive(now, s) ? easeOut(localT(now, s)) : 1;
      setLine(lAgentVerify, t);
      if (t > 0.4) setActive(nVerify, true);
      // mandate line draws in second half
      setLine(lVerifyMandate, Math.max(0, t * 1.4 - 0.4));
      if (t > 0.7) setActive(nMandate, true);
      chipsG.setAttribute("opacity", Math.max(0, t * 1.2 - 0.2));
    }

    // ---- decide → not authorized (block branch) ----
    if (onOrPast("decide")) {
      const s = SHOTS.find((x) => x.id === "decide");
      const t = isActive(now, s) ? easeOut(localT(now, s)) : 1;
      setLine(lMandateBlock, t);
      if (t > 0.5) setActive(nBlock, true);
    }

    // ---- request: pulse to user, draw block→user line ----
    if (onOrPast("request")) {
      const s = SHOTS.find((x) => x.id === "request");
      const t = isActive(now, s) ? easeOut(localT(now, s)) : 1;
      setLine(lBlockUser, t);
      if (t > 0.4) setActive(nUser, true);
      // pulse anim
      const p = isActive(now, s) ? Math.sin(localT(now, s) * Math.PI) : 0;
      pulseG.setAttribute("opacity", isActive(now, s) ? 0.7 * p : 0);
      pulse.setAttribute("r", 18 + p * 30);
    }

    // ---- collect: approval card appears ----
    if (onOrPast("collect")) {
      const s = SHOTS.find((x) => x.id === "collect");
      const t = isActive(now, s) ? easeOut(localT(now, s)) : 1;
      approvalG.setAttribute("opacity", t);
      setActive(nUser, true);
    }

    // ---- update: user → allow line ----
    if (onOrPast("update")) {
      const s = SHOTS.find((x) => x.id === "update");
      const t = isActive(now, s) ? easeOut(localT(now, s)) : 1;
      setLine(lUserMandate, t);
      if (t > 0.5) setActive(nAllow, true);
      // approval card stays visible up to/through update
      approvalG.setAttribute("opacity", 1);
    }

    // ---- reverify: allow branch now flips on, block ghosts away ----
    if (onOrPast("reverify")) {
      const s = SHOTS.find((x) => x.id === "reverify");
      const t = isActive(now, s) ? easeOut(localT(now, s)) : 1;
      setActive(nVerify, true);
      setActive(nMandate, true);
      // block line recedes
      setLine(lMandateBlock, Math.max(0, 1 - t));
      if (t > 0.4) setActive(nAllow, true);
      // tick draws
      tickPath.setAttribute("stroke-dashoffset", tickLen * (1 - t));
      // user/approval recedes
      approvalG.setAttribute("opacity", Math.max(0, 1 - t));
    }

    // ---- execute ----
    if (onOrPast("execute")) {
      const s = SHOTS.find((x) => x.id === "execute");
      const t = isActive(now, s) ? easeOut(localT(now, s)) : 1;
      setActive(nAllow, true);
      setLine(lAllowExec, t);
      if (t > 0.5) setActive(nExecute, true);
    }

    // ---- proof ----
    if (onOrPast("proof")) {
      const s = SHOTS.find((x) => x.id === "proof");
      const t = isActive(now, s) ? easeOut(localT(now, s)) : 1;
      setLineFull(lAllowExec, true);
      setActive(nExecute, true);
      setLine(lExecProof, t);
      if (t > 0.5) setActive(nProof, true);
      proofStamp.setAttribute("opacity", t);
      // share fan-out begins
      lShare.forEach((l, i) => {
        const stagger = Math.max(0, Math.min(1, t * 1.4 - i * 0.1));
        setLine(l, stagger);
      });
      partnerEls.forEach((g, i) => {
        const stagger = Math.max(0, Math.min(1, t * 1.4 - i * 0.1));
        g.style.opacity = 0.3 + 0.7 * stagger;
      });
    }

    // ---- HOLD ----
    if (now >= HOLD_START) {
      // keep last frame state fully on
      setActive(nAgent, true);
      setActive(nVerify, true);
      setActive(nMandate, true);
      setActive(nAllow, true);
      setActive(nExecute, true);
      setActive(nProof, true);
      setLineFull(lAgentVerify, true);
      setLineFull(lVerifyMandate, true);
      lShare.forEach((l) => setLineFull(l, true));
      partnerEls.forEach((g) => (g.style.opacity = 1));
      setLineFull(lAllowExec, true);
      setLineFull(lExecProof, true);
      // block hidden
      setLine(lMandateBlock, 0);
      tickPath.setAttribute("stroke-dashoffset", 0);
      proofStamp.setAttribute("opacity", 1);
      payloadG.setAttribute("opacity", 1);
      chipsG.setAttribute("opacity", 1);
      approvalG.setAttribute("opacity", 0);

      // soft glow on verify + proof + execute
      const holdT = (now - HOLD_START) / (1 - HOLD_START); // 0..1 across hold
      const breath = 0.3 + 0.5 * (0.5 + 0.5 * Math.sin(holdT * Math.PI * 4)); // gentle pulse
      glowVerify.setAttribute("opacity", breath);
      glowProof.setAttribute("opacity", breath);
      glowExecute.setAttribute("opacity", breath * 0.7);

      // tail fade just at the very end (last 5%)
      if (now > 0.97) {
        const t = (now - 0.97) / 0.03;
        svg.style.opacity = 1 - t * 0.6;
      }
    }
  }

  // z-order — glow under nodes, payload/approval/stamp on top
  svg.insertBefore(glowVerify, nVerify);
  svg.insertBefore(glowProof, nProof);
  svg.insertBefore(glowExecute, nExecute);
  // user → allow arrow runs behind the mandate card so the vertical leg doesn't draw over it
  svg.insertBefore(lUserMandate, nMandate);
  svg.appendChild(chipsG);
  svg.appendChild(payloadG);
  svg.appendChild(approvalG);
  svg.appendChild(pulseG);
  svg.appendChild(tickG);
  svg.appendChild(proofStamp);
  partnerEls.forEach((g) => svg.insertBefore(g, annoG));
  svg.appendChild(annoG);

  // ---- driver --------------------------------------------------
  const mql =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
  let raf = 0;
  let t0 = performance.now();
  let visible = true;

  function tick(now) {
    if (!visible) {
      raf = 0;
      return;
    }
    const elapsed = (now - t0) % DURATION;
    render(elapsed / DURATION);
    raf = requestAnimationFrame(tick);
  }
  function start() {
    if (raf) return;
    t0 = performance.now();
    raf = requestAnimationFrame(tick);
  }
  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  if (mql && mql.matches) {
    // freeze on the hold state (full diagram + overlay)
    render(0.5);
  } else {
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            visible = e.isIntersecting;
            if (visible) start();
            else stop();
          });
        },
        { threshold: 0.15 },
      );
      io.observe(ROOT);
    } else {
      start();
    }
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stop();
      else if (visible) start();
    });
  }

  render(0);
})();
