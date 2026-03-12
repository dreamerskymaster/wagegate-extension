// ═══════════════════════════════════════════════════════════════════════════
// WageGate H1B Level Badge - Content Script
// Runs on LinkedIn Jobs and Indeed job detail pages.
// Extracts job title, location, salary -> calls WageGate API -> injects badge.
// ═══════════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ── CONFIG ──────────────────────────────────────────────────────────────
  // Toggle between local dev and production:
  // const API_URL = 'http://localhost:3000/api/prevailing-wage';
  const API_URL = 'https://wagegate.onrender.com/api/prevailing-wage';

  // const WAGEGATE_BASE = 'http://localhost:3000';
  const WAGEGATE_BASE = 'https://wagegate.onrender.com';

  const BADGE_ID = 'wagegate-h1b-badge';
  const POLL_INTERVAL = 1200;   // ms between URL change checks
  const DOM_SETTLE_MS = 1800;   // ms to wait after URL change for DOM to settle
  const CACHE_TTL = 10 * 60 * 1000; // 10 min in-memory cache per URL

  // ── STATE ───────────────────────────────────────────────────────────────
  let lastHref = '';
  let lastExtracted = '';
  let debounceTimer = null;
  const cache = {};  // keyed by URL, value = { data, ts }

  // ── US STATE ABBREVIATIONS (for validation) ─────────────────────────────
  const VALID_ABBRS = new Set([
    'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN',
    'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV',
    'NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN',
    'TX','UT','VT','VA','WA','WV','WI','WY','DC'
  ]);

  const STATE_NAMES_TO_ABBR = {
    'alabama':'AL','alaska':'AK','arizona':'AZ','arkansas':'AR','california':'CA',
    'colorado':'CO','connecticut':'CT','delaware':'DE','florida':'FL','georgia':'GA',
    'hawaii':'HI','idaho':'ID','illinois':'IL','indiana':'IN','iowa':'IA',
    'kansas':'KS','kentucky':'KY','louisiana':'LA','maine':'ME','maryland':'MD',
    'massachusetts':'MA','michigan':'MI','minnesota':'MN','mississippi':'MS',
    'missouri':'MO','montana':'MT','nebraska':'NE','nevada':'NV',
    'new hampshire':'NH','new jersey':'NJ','new mexico':'NM','new york':'NY',
    'north carolina':'NC','north dakota':'ND','ohio':'OH','oklahoma':'OK',
    'oregon':'OR','pennsylvania':'PA','rhode island':'RI','south carolina':'SC',
    'south dakota':'SD','tennessee':'TN','texas':'TX','utah':'UT','vermont':'VT',
    'virginia':'VA','washington':'WA','west virginia':'WV','wisconsin':'WI','wyoming':'WY',
    'district of columbia':'DC'
  };

  // ── SITE DETECTION ──────────────────────────────────────────────────────
  function getSite() {
    const h = window.location.hostname;
    if (h.includes('linkedin.com')) return 'linkedin';
    if (h.includes('indeed.com')) return 'indeed';
    return null;
  }

  // ── EXTRACT: LINKEDIN ──────────────────────────────────────────────────
  function extractLinkedIn() {
    // 1. Title
    const titleEl =
      document.querySelector('.job-details-jobs-unified-top-card__job-title h1') ||
      document.querySelector('.topcard__link h2') ||
      document.querySelector('h1.t-24.t-bold.inline') ||
      document.querySelector('h1.jobs-unified-top-card__job-title') ||
      document.querySelector('h1.top-card-layout__title');
    
    let title = titleEl?.textContent?.trim() || null;
    if (title && (title.includes(' jobs in ') || title.includes(' jobs found'))) {
      const alt = document.querySelector('.topcard__link h2') || document.querySelector('.jobs-unified-top-card__job-title');
      if (alt) title = alt.textContent.trim();
    }

    // 2. Location
    const locEl =
      document.querySelector('.job-details-jobs-unified-top-card__primary-description-container .tvm__text') ||
      document.querySelector('.job-details-jobs-unified-top-card__primary-description span:last-child') ||
      document.querySelector('.jobs-unified-top-card__bullet') ||
      document.querySelector('.topcard__flavor--bullet') ||
      document.querySelector('[data-test-job-location]');
    const locText = locEl?.textContent?.trim() || '';

    // 3. Salary - Scan dedicated fields first
    let salaryText = '';
    const salEl =
      document.querySelector('.compensation__salary') ||
      document.querySelector('.salary.compensation__salary') ||
      document.querySelector('[data-test="pay-salary"]') ||
      document.querySelector('.job-details-jobs-unified-top-card__job-insight--highlight span');
    
    if (salEl) salaryText = salEl.textContent.trim();

    // 4. Aggressive Pill Scan (Typical for Unified View)
    if (!salaryText || !salaryText.includes('$')) {
      const selectors = [
        '.job-details-jobs-unified-top-card__job-insight',
        '.jobs-unified-top-card__job-insight',
        '.topcard__flavor',
        '.ui-pill',
        '.job-details-jobs-unified-top-card__job-insight--highlight'
      ];
      
      for (const selector of selectors) {
        const els = document.querySelectorAll(selector);
        for (const el of els) {
          const txt = el.textContent.trim();
          if (txt.includes('$') && !txt.includes('applicants')) {
            salaryText = txt;
            break;
          }
        }
        if (salaryText) break;
      }
    }

    // 5. DEEP SCAN: If still no salary, scan the entire Job Description text
    if (!salaryText || !salaryText.includes('$')) {
      const jdEl = document.querySelector('.jobs-description__content') || 
                   document.querySelector('.jobs-box__html-content') || 
                   document.querySelector('#job-details');
      if (jdEl) {
        // Regex for common salary patterns in text
        const match = jdEl.innerText.match(/\$[\d,]+k?(\s*[-–]\s*\$[\d,]+k?)?(\s*(per|a|\/)\s*(year|hr|hour|mo|month|annually))?/i);
        if (match) salaryText = match[0];
      }
    }

    return { title, locText, salaryText };
  }

  // ── EXTRACT: INDEED ────────────────────────────────────────────────────
  function extractIndeed() {
    // Title
    const titleEl =
      document.querySelector('h2.jobsearch-JobInfoHeader-title') ||
      document.querySelector('h1[data-testid="jobsearch-JobInfoHeader-title"]') ||
      document.querySelector('h1.jobsearch-JobInfoHeader-title') ||
      document.querySelector('h2') ||
      document.querySelector('h1');
    const title = titleEl?.textContent?.trim() || null;

    // Location
    const locEl =
      document.querySelector('[data-testid="inlineHeader-companyLocation"]') ||
      document.querySelector('div[data-testid="jobsearch-JobInfoHeader-location"]') ||
      document.querySelector('.jobsearch-JobInfoHeader-companyLocation');
    const locText = locEl?.textContent?.trim() || '';

    // Salary
    let salaryText = '';
    const salEl =
      document.querySelector('#salaryInfoAndJobType') ||
      document.querySelector('[data-testid="salary-snippet-container"]') ||
      document.querySelector('.jobsearch-JobMetadataHeader-item');
    if (salEl) {
      const txt = salEl.textContent;
      if (txt.includes('$')) salaryText = txt.trim();
    }

    // Deep scan JD for Indeed
    if (!salaryText || !salaryText.includes('$')) {
      const jdEl = document.querySelector('#jobDescriptionText');
      if (jdEl) {
        const match = jdEl.innerText.match(/\$[\d,]+k?(\s*[-–]\s*\$[\d,]+k?)?(\s*(per|a|\/)\s*(year|hr|hour|mo|month|annually))?/i);
        if (match) salaryText = match[0];
      }
    }

    return { title, locText, salaryText };
  }

  // ── PARSE STATE FROM LOCATION TEXT ──────────────────────────────────────
  function parseState(locText) {
    if (!locText) return null;

    // Clean up common noise
    const cleaned = locText.replace(/\(.*?\)/g, '').replace(/United States/gi, '').trim();

    // Split by comma
    const parts = cleaned.split(',').map(p => p.trim()).filter(Boolean);

    // Strategy 1: Check each part for a 2-letter abbreviation
    for (const part of parts) {
      const tokens = part.split(/\s+/);
      for (const token of tokens) {
        const up = token.toUpperCase().replace(/[^A-Z]/g, '');
        if (up.length === 2 && VALID_ABBRS.has(up)) return up;
      }
    }

    // Strategy 2: Check for full state names
    for (const part of parts) {
      const lower = part.toLowerCase().trim();
      if (STATE_NAMES_TO_ABBR[lower]) return STATE_NAMES_TO_ABBR[lower];
      for (const [name, abbr] of Object.entries(STATE_NAMES_TO_ABBR)) {
        if (lower.includes(name)) return abbr;
      }
    }

    return null;
  }

  // ── PARSE SALARY FROM TEXT ─────────────────────────────────────────────
  function parseSalary(salaryText) {
    if (!salaryText) return null;
    
    const clean = salaryText.toLowerCase().replace(/,/g, '');
    let result = null;

    // 1. Handle "100k - 150k" or "$120k" cases
    // We prioritize the FIRST value (minimum) as per user request
    const kMatches = clean.match(/(\d+(?:\.\d+)?)\s*k/g);
    if (kMatches) {
      result = parseFloat(kMatches[0]) * 1000;
    }

    // 2. Fallback to general numeric extraction if no 'k' matches
    if (!result) {
      const matches = clean.match(/\$(\d+(?:\.\d+)?)/g);
      if (matches) {
        result = parseFloat(matches[0].replace('$', ''));
      }
    }

    if (!result) return null;

    // 3. Conversion Heuristics (Crucial for H1B Comparison)
    if (clean.includes('/hr') || clean.includes('hour') || (result < 500)) {
      result = Math.round(result * 2080);
    } 
    else if (clean.includes('/mo') || clean.includes('month')) {
      if (result < 20000) {
        result = Math.round(result * 12);
      }
    }

    return result;
  }

  // ── API CALL ───────────────────────────────────────────────────────────
  async function callWageGate(title, state, location, salary) {
    const url = window.location.href;

    // Check cache
    const cached = cache[url];
    if (cached && (Date.now() - cached.ts < CACHE_TTL)) {
      return cached.data;
    }

    return new Promise((resolve) => {
      chrome.runtime.sendMessage({
        type: 'FETCH_WAGE',
        data: { title, state, location, salary, year: 2026 }
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn('[WageGate] Extension Error:', chrome.runtime.lastError);
          resolve(null);
          return;
        }

        if (response && response.success) {
          cache[url] = { data: response.data, ts: Date.now() };
          resolve(response.data);
        } else {
          console.warn('[WageGate] API Error:', response?.error);
          resolve(null);
        }
      });
    });
  }

  // ── BADGE INJECTION ────────────────────────────────────────────────────
  function removeBadge() {
    const old = document.getElementById(BADGE_ID);
    if (old) old.remove();
  }

  function buildBadgeUrl(title, state, salary) {
    const params = new URLSearchParams();
    if (title) params.set('title', title);
    if (state) params.set('state', state);
    if (salary) params.set('salary', salary);
    return WAGEGATE_BASE + '/?' + params.toString();
  }

  function injectBadge(apiData, title, state, salary) {
    removeBadge();

    const site = getSite();
    let anchor = null;

    if (site === 'linkedin') {
      anchor =
        document.querySelector('.job-details-jobs-unified-top-card__job-title h1') ||
        document.querySelector('.topcard__link h2') ||
        document.querySelector('h1.t-24.t-bold.inline') ||
        document.querySelector('.jobs-unified-top-card__content--two-pane h1');
    } else if (site === 'indeed') {
      anchor =
        document.querySelector('h2.jobsearch-JobInfoHeader-title') ||
        document.querySelector('h1[data-testid="jobsearch-JobInfoHeader-title"]') ||
        document.querySelector('h1');
    }

    if (!anchor) {
      console.log('[WageGate] No anchor element found for badge.');
      return;
    }

    const badge = document.createElement('a');
    badge.id = BADGE_ID;
    badge.href = buildBadgeUrl(title, state, salary);
    badge.target = '_blank';
    badge.rel = 'noopener noreferrer';

    // Determine badge text and color
    let text, bgColor, tooltip;

    if (!salary) {
      text = 'No Salary in JD';
      bgColor = 'hsl(215, 15%, 45%)'; // Sleek slate gray
      tooltip = 'No numeric salary found in job description.';
    } else if (apiData && apiData.ok && apiData.level !== null) {
      if (apiData.level === 1) {
        text = 'H1B Level 1';
        bgColor = 'hsl(200, 75%, 45%)'; // Cyan-Blue
      } else if (apiData.level === 2) {
        text = 'H1B Level 2';
        bgColor = 'hsl(180, 85%, 35%)'; // Vibrant Teal
      } else if (apiData.level === 3) {
        text = 'H1B Level 3';
        bgColor = 'hsl(160, 80%, 40%)'; // Emerald Green
      } else if (apiData.level === 4) {
        text = 'H1B Level 4';
        bgColor = 'hsl(140, 75%, 35%)'; // Forest Green
      } else {
        text = 'H1B: Below L1';
        bgColor = 'hsl(0, 70%, 50%)'; // Alert Red
      }
      tooltip = `Estimated Level ${apiData.level || '0'} for ${apiData.locationResolved || state || 'area'}. Click for details.`;
    } else if (apiData && apiData.ok && apiData.suggestCalculator) {
      text = 'H1B: Check';
      bgColor = 'hsl(200, 75%, 45%)';
      tooltip = apiData.message + ' Click to open WageGate.';
    } else {
      text = 'WageGate H1B';
      bgColor = 'hsl(215, 15%, 45%)';
      tooltip = apiData?.message || 'Check H1B levels on WageGate.';
    }

    badge.textContent = text;
    badge.title = tooltip;

    // Style as inline pill
    Object.assign(badge.style, {
      display: 'inline-flex',
      alignItems: 'center',
      marginLeft: '12px',
      padding: '3px 10px',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: '700',
      fontFamily: "Inter, system-ui, sans-serif",
      backgroundColor: bgColor,
      color: '#ffffff',
      textDecoration: 'none',
      cursor: 'pointer',
      verticalAlign: 'middle',
      lineHeight: '1',
      whiteSpace: 'nowrap',
      transition: 'transform 0.1s ease',
      boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
      zIndex: '999'
    });

    badge.addEventListener('mouseenter', () => { badge.style.transform = 'scale(1.05)'; });
    badge.addEventListener('mouseleave', () => { badge.style.transform = 'scale(1)'; });

    anchor.parentElement.style.display = 'flex';
    anchor.parentElement.style.alignItems = 'center';
    anchor.parentElement.style.flexWrap = 'wrap';

    anchor.after(badge);
    console.log('[WageGate] Badge injected:', text);
  }

  // ── MAIN ORCHESTRATOR ──────────────────────────────────────────────────
  async function processPage() {
    // Zombie check: if extension was reloaded/uninstalled, this context is dead.
    if (!chrome.runtime?.id) {
      console.log('[WageGate] Context invalidated, stopping script.');
      return;
    }

    const site = getSite();
    if (!site) return;

    let extracted;
    if (site === 'linkedin') extracted = extractLinkedIn();
    else if (site === 'indeed') extracted = extractIndeed();
    else return;

    const { title, locText, salaryText } = extracted;

    if (!title) {
      console.log('[WageGate] No job title found, skipping.');
      return;
    }

    const state = parseState(locText);
    const salary = parseSalary(salaryText);

    // Dedup: don't re-call if same extraction
    const fingerprint = `${title}|${state}|${salary}`;
    if (fingerprint === lastExtracted) {
      console.log('[WageGate] Same data, skipping re-call.');
      return;
    }
    lastExtracted = fingerprint;

    console.log('[WageGate] Extracted:', { title, state, salary, locText, salaryText });

    if (!state) {
      // Still inject a fallback badge linking to WageGate
      injectBadge(null, title, null, salary);
      return;
    }

    const data = await callWageGate(title, state, locText, salary);
    injectBadge(data, title, state, salary);
  }

  // ── URL WATCHER (SPA navigation handler) ───────────────────────────────
  function startWatcher() {
    lastHref = window.location.href;

    setInterval(() => {
      const current = window.location.href;
      if (current !== lastHref) {
        lastHref = current;
        lastExtracted = '';
        removeBadge();

        // Debounce: wait for DOM to settle after SPA navigation
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          processPage();
        }, DOM_SETTLE_MS);
      }
    }, POLL_INTERVAL);
  }

  // ── BOOT ───────────────────────────────────────────────────────────────
  console.log('[WageGate] Content script loaded on', getSite());

  // Initial run after short delay (page may still be loading)
  setTimeout(processPage, DOM_SETTLE_MS);

  // Start watching for SPA navigation
  startWatcher();

})();
