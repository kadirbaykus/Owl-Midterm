# The Salty Catch

A colourful 3D fish & chips restaurant tycoon built with Three.js and Vite. All in-game text is English. The scene uses original procedural low-poly models with an isometric-style orbit camera.

## Run

Requires Node.js 20.19+ or 22.12+ (validated with Node 24).

```sh
npm ci
npm run dev
```

## Production

```sh
npm run build
npm run preview
```

## Play

Open **Orders** from the top-left corner and **Upgrades** from the top-right. Both panels can stay open independently and close with ×, Escape, or a click on the scene. The Pantry tab is inside Orders. Prepare customer orders before their patience runs out. Buy cod, potatoes and shrimp in **Pantry**. Spend earnings in **Upgrades** to improve the fryer, add waiting capacity and unlock shrimp orders. Each sale earns money and reputation; every 100 reputation raises your level. Ingredients are deducted when cooking begins. Hire a chef for $150 in Upgrades to automatically prepare and serve one order at a time. The chef uses the same ingredients and fryer speed as manual service, waits when stock is insufficient, and resumes after restocking. Hiring is permanent and saved with existing progress. Pausing freezes cooking and customers.

The interface uses a fixed 16:9 landscape stage, scaled to fit the screen without scrolling. On phones, use landscape orientation for larger controls. Camera dragging and wheel zoom are disabled; use the scene buttons to adjust the view. Progress saves automatically to this browser's local storage; **Save game** saves immediately and **New game** resets progress after confirmation. Sound is optional. A WebGL-capable browser is required.

This is a single-player prototype: saves are local to the current browser, with no accounts or online synchronisation. Customer queues restart on reload. No API keys or external services are required.
