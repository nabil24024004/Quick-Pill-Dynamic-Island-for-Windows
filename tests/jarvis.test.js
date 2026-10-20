"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

test("JARVIS Integration - AskAI component exists and implements required Ripple UI states", () => {
  const askAiPath = path.join(__dirname, "../src/components/AskAI.jsx");
  assert.ok(fs.existsSync(askAiPath), "AskAI.jsx must exist");

  const content = fs.readFileSync(askAiPath, "utf8");

  // Initial State assertions
  assert.ok(content.includes("Ask Jarvis anything...") || content.includes("Type a command or question..."), "Must include prompt placeholder");
  assert.ok(content.includes("Ask"), "Must include Ask button");

  // Loading State assertions
  assert.ok(content.includes("Thinking...") || content.includes("JARVIS is thinking"), "Must include thinking indicator");

  // Response State assertions
  assert.ok(content.includes("Ask another"), "Must include Ask another reset button");
  assert.ok(content.includes("ai-scrollable"), "Must have ai-scrollable class for response box");

  // Offline / Error State assertions
  assert.ok(content.includes("JARVIS local server offline") || content.includes("JARVIS Offline"), "Must have offline error fallback");
});

test("JARVIS Integration - main.js implements jarvis:* IPC handlers with safe fallback", () => {
  const mainPath = path.join(__dirname, "../src/main.js");
  const content = fs.readFileSync(mainPath, "utf8");

  assert.ok(content.includes('"jarvis:ask"'), "Must implement jarvis:ask IPC handler");
  assert.ok(content.includes('"jarvis:testConnection"'), "Must implement jarvis:testConnection IPC handler");
  assert.ok(content.includes('"jarvis:getConfig"'), "Must implement jarvis:getConfig IPC handler");
  assert.ok(content.includes('"jarvis:setConfig"'), "Must implement jarvis:setConfig IPC handler");
  assert.ok(content.includes('"jarvis:launchServer"'), "Must implement jarvis:launchServer IPC handler");
  assert.ok(content.includes("127.0.0.1:8765"), "Default endpoint must point to D:/JARVIS (127.0.0.1:8765)");
  assert.ok(content.includes("JARVIS local server offline. Make sure D:/JARVIS is running."), "Must return standard offline error message");
});

test("JARVIS Integration - preload.js exposes askJarvis and config methods", () => {
  const preloadPath = path.join(__dirname, "../src/preload.js");
  const content = fs.readFileSync(preloadPath, "utf8");

  assert.ok(content.includes("askJarvis:"), "Must expose askJarvis in preload");
  assert.ok(content.includes("getJarvisConfig:"), "Must expose getJarvisConfig in preload");
  assert.ok(content.includes("setJarvisConfig:"), "Must expose setJarvisConfig in preload");
  assert.ok(content.includes("testJarvisConnection:"), "Must expose testJarvisConnection in preload");
});

test("JARVIS Integration - SettingsWindow includes dedicated JARVIS configuration", () => {
  const settingsPath = path.join(__dirname, "../src/components/SettingsWindow.jsx");
  const content = fs.readFileSync(settingsPath, "utf8");

  assert.ok(content.includes("JARVIS AI Integration"), "Must have JARVIS AI Integration section header");
  assert.ok(content.includes("Enable JARVIS Integration"), "Must have enable/disable toggle");
  assert.ok(content.includes("Local API URL Endpoint"), "Must have local endpoint configuration");
  assert.ok(content.includes("Test Connection"), "Must have Test Connection button");
});

test("JARVIS Integration - Island.jsx mounts AskAI as Tab 16 with ErrorBoundary", () => {
  const islandPath = path.join(__dirname, "../src/Island.jsx");
  const content = fs.readFileSync(islandPath, "utf8");

  assert.ok(content.includes("import AskAI from"), "Must import AskAI component");
  assert.ok(content.includes('name: "Ask AI"'), "Must include Ask AI in TABS");
  assert.ok(content.includes("currentTab === 16"), "Must render on tab 16");
  assert.ok(content.includes('<ErrorBoundary tabName="Ask AI"'), "Must be safely wrapped in ErrorBoundary");
  assert.ok(content.includes("saved.includes(16)"), "Must migrate tab 16 into saved tab-order");
});
