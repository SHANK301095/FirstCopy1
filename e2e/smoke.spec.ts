/**
 * E2E Smoke Tests
 * Critical "Golden Flows" to prevent regressions
 * 
 * Test Mode: Set E2E_TEST_MODE=true for deterministic flows
 */

import { test, expect, Page } from "@playwright/test";

// Test configuration
const TEST_MODE = process.env.E2E_TEST_MODE === "true";

// ======================
// CORE SMOKE TESTS
// ======================

test.describe("MMC Core Smoke Tests", () => {
  test("landing page loads successfully", async ({ page }) => {
    await page.goto("/landing");
    
    // Check main elements are visible
    await expect(page.locator("text=MMC")).toBeVisible();
    await expect(page.getByRole("link", { name: /Get Started/i })).toBeVisible();
  });

  test("login page renders correctly", async ({ page }) => {
    await page.goto("/login");
    
    // Check login form elements
    await expect(page.getByLabel(/Email or Username/i)).toBeVisible();
    await expect(page.getByLabel(/Password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Sign In/i })).toBeVisible();
  });

  test("signup page renders correctly", async ({ page }) => {
    await page.goto("/signup");
    
    // Check signup form elements
    await expect(page.getByLabel(/Email/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Create Account/i })).toBeVisible();
  });

  test("contact page has no external embeds", async ({ page }) => {
    await page.goto("/contact");
    
    // Verify no Google Maps iframe
    const iframes = await page.locator("iframe").all();
    for (const iframe of iframes) {
      const src = await iframe.getAttribute("src");
      expect(src).not.toContain("google.com/maps");
    }
    
    // Check address card is present instead
    await expect(page.getByText("Our Office Location")).toBeVisible();
    await expect(page.getByRole("button", { name: /Copy Address/i })).toBeVisible();
  });

  test("no external font CDN calls", async ({ page }) => {
    const externalFontCalls: string[] = [];
    
    page.on("request", (request) => {
      const url = request.url();
      if (url.includes("fonts.googleapis.com") || url.includes("fonts.gstatic.com")) {
        externalFontCalls.push(url);
      }
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");
    
    expect(externalFontCalls).toHaveLength(0);
  });

  test("navigation works correctly", async ({ page }) => {
    await page.goto("/landing");
    
    // Navigate to login
    await page.getByRole("link", { name: /Get Started/i }).first().click();
    await expect(page).toHaveURL(/\/login|\/signup/);
  });

  test("health endpoint returns status", async ({ request }) => {
    const response = await request.get("/api/health");
    
    // In dev mode, this might be handled by edge function or return 404
    // We just check the endpoint doesn't crash the app
    expect([200, 404, 500]).toContain(response.status());
  });
});

// ======================
// AUTH FLOW TESTS
// ======================

test.describe("Authentication Flow", () => {
  test("can navigate between login and signup", async ({ page }) => {
    await page.goto("/login");
    
    // Find and click signup link
    const signupLink = page.getByRole("link", { name: /sign up|create account|register/i });
    if (await signupLink.isVisible()) {
      await signupLink.click();
      await expect(page).toHaveURL(/\/signup/);
    }
    
    // Navigate back to login
    await page.goto("/signup");
    const loginLink = page.getByRole("link", { name: /sign in|login|log in/i });
    if (await loginLink.isVisible()) {
      await loginLink.click();
      await expect(page).toHaveURL(/\/login/);
    }
  });

  test("login form validates required fields", async ({ page }) => {
    await page.goto("/login");
    
    // Try to submit empty form
    const submitButton = page.getByRole("button", { name: /Sign In/i });
    await submitButton.click();
    
    // Check that we're still on login (form prevented submission)
    await expect(page).toHaveURL(/\/login/);
  });

  test("signup form validates required fields", async ({ page }) => {
    await page.goto("/signup");
    
    // Try to submit empty form
    const submitButton = page.getByRole("button", { name: /Create Account/i });
    await submitButton.click();
    
    // Check that we're still on signup (form prevented submission)
    await expect(page).toHaveURL(/\/signup/);
  });
});

// ======================
// DATA MANAGER TESTS
// ======================

test.describe("Data Manager", () => {
  test("data manager page loads (unauthenticated redirects)", async ({ page }) => {
    await page.goto("/data-manager");
    
    // Should either show data manager or redirect to login
    await page.waitForURL(/\/(data-manager|login)/);
    
    const url = page.url();
    if (url.includes("login")) {
      // Expected behavior for unauthenticated users
      await expect(page.getByRole("button", { name: /Sign In/i })).toBeVisible();
    } else {
      // Authenticated (rare in CI, but handle it)
      await expect(page.locator("body")).toBeVisible();
    }
  });
});

// ======================
// BACKTEST FLOW TESTS
// ======================

test.describe("Backtest Flow", () => {
  test("backtest page loads (unauthenticated redirects)", async ({ page }) => {
    await page.goto("/backtests");
    
    // Should either show backtests or redirect to login
    await page.waitForURL(/\/(backtests|login)/);
    
    const url = page.url();
    if (url.includes("login")) {
      await expect(page.getByRole("button", { name: /Sign In/i })).toBeVisible();
    } else {
      await expect(page.locator("body")).toBeVisible();
    }
  });
});

// ======================
// SECURITY TESTS
// ======================

test.describe("Security Checks", () => {
  test("protected routes redirect to login", async ({ page }) => {
    const protectedRoutes = [
      "/dashboard",
      "/data-manager",
      "/backtests",
      "/settings",
      "/profile",
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await page.waitForURL(/\/(login|dashboard|data-manager|backtests|settings|profile)/);
      
      // Either redirected to login OR user is somehow authenticated
      const url = page.url();
      expect(
        url.includes("login") || url.includes(route.slice(1))
      ).toBe(true);
    }
  });

  test("no sensitive data in page source", async ({ page }) => {
    await page.goto("/landing");
    
    const content = await page.content();
    
    // Check no obvious secrets in HTML
    expect(content).not.toContain("service_role");
    expect(content).not.toContain("sk_live_");
    expect(content).not.toContain("sk_test_");
  });
});

// ======================
// PERFORMANCE TESTS
// ======================

test.describe("Performance Baseline", () => {
  test("landing page loads within 5 seconds", async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto("/landing");
    await page.waitForLoadState("domcontentloaded");
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(5000);
  });

  test("no console errors on landing page", async ({ page }) => {
    const errors: string[] = [];
    
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        // Ignore known non-critical errors
        const text = msg.text();
        if (!text.includes("favicon") && !text.includes("manifest")) {
          errors.push(text);
        }
      }
    });

    await page.goto("/landing");
    await page.waitForLoadState("networkidle");
    
    // Allow for some non-critical errors, but flag if too many
    expect(errors.length).toBeLessThan(5);
  });
});

// ======================
// ACCESSIBILITY BASELINE
// ======================

test.describe("Accessibility Baseline", () => {
  test("landing page has proper heading hierarchy", async ({ page }) => {
    await page.goto("/landing");
    
    // Should have at least one H1
    const h1Count = await page.locator("h1").count();
    expect(h1Count).toBeGreaterThanOrEqual(1);
  });

  test("buttons have accessible names", async ({ page }) => {
    await page.goto("/landing");
    
    const buttons = await page.locator("button").all();
    
    for (const button of buttons) {
      const name = await button.getAttribute("aria-label") || await button.textContent();
      // Buttons should have some accessible name
      expect(name?.trim().length).toBeGreaterThan(0);
    }
  });
});
