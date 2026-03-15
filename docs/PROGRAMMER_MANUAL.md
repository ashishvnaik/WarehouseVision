# WarehouseVision — Programmer Manual

**Role:** Programmer
**Version:** 1.0
**Last Updated:** March 2026

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Testing Mode](#2-testing-mode)
3. [Managing Prompts](#3-managing-prompts)
4. [Managing Training Examples](#4-managing-training-examples)
5. [Using the Evaluation Page](#5-using-the-evaluation-page)
6. [Recommended Workflow for Improving Accuracy](#6-recommended-workflow-for-improving-accuracy)

---

## 1. Getting Started

The Programmer role in WarehouseVision is responsible for improving the accuracy of the AI inference pipeline. This involves iterating on prompt versions, curating few-shot training examples, and evaluating model outputs against real warehouse images — all without affecting the live inventory data used by Operators and Supervisors.

### Logging In

1. Open WarehouseVision in your browser.
2. On the login page, select **Programmer** from the role selector.
3. Enter your Programmer password and click **Log In**.
4. You will land on the **Prompts page** — your default workspace.

### Pages Available to You

| Page | Purpose |
|------|---------|
| Prompts | Create, edit, and manage versioned AI prompt templates |
| Training Examples | Manage the few-shot examples that are injected into prompts |
| Evaluation | Run inference against images and compare prompt/model combinations |

You also have access to a **Testing Mode toggle** in the sidebar, which is essential for safe experimentation (see Section 2).

---

## 2. Testing Mode

Testing Mode allows you to run the full upload and analysis pipeline without writing any results to the live inventory database. This is the primary safety mechanism for prompt development and experimentation.

### Enabling Testing Mode

- The **Testing Mode toggle** is located in the sidebar.
- Click it to turn Testing Mode **ON**.
- When active, an amber banner reading **"TESTING MODE ACTIVE — your uploads will not be saved to inventory"** will appear at the top of all pages.

### How Testing Mode Works

- When Testing Mode is ON, any analyses you run — whether from the Evaluation page or by performing a direct upload — are processed normally but their results are **not written to the inventory database**.
- Testing Mode is **per-session and per-user**: it only affects your own uploads. Operators and Supervisors using the system at the same time are completely unaffected.
- Testing Mode **resets to OFF automatically when you log out**. You must re-enable it each session when needed.

### When to Use Testing Mode

- Always enable Testing Mode before experimenting with new prompts or models.
- Disable Testing Mode only after you have confirmed that your changes are production-ready and you want real uploads to be saved to inventory.

> **Important:** Do not leave Testing Mode ON indefinitely. If you log out with Testing Mode active, it resets automatically — but always confirm the toggle state at the start of each working session.

---

## 3. Managing Prompts

The **Prompts page** is where you manage the versioned AI prompt templates used during image analysis. One prompt is designated as the **default** at any given time; this is the prompt used for all new analyses run by Operators.

### Viewing Prompts

The Prompts page lists all prompt versions in the system. Each entry displays:

- **Version number** — e.g. `v1`, `v2`, `v1.2`
- **Name** — a short human-readable label
- **Description** — a summary of what this prompt does or what changed
- **Default indicator** — marks which prompt is currently active for production use

### Creating a New Prompt

1. Click **"New Prompt"**.
2. Fill in the following fields:
   - **Version** — a version identifier (use a consistent scheme such as `v2`, `v2.1`, etc.)
   - **Name** — a short descriptive name
   - **Description** — explain what this prompt does differently from previous versions
   - **Prompt text** — the full prompt that will be sent to the AI model
3. Save the prompt. It will appear in the list but will not be set as default until you explicitly do so.

### Editing a Prompt

Click the **edit icon** on any prompt to modify its name, description, or prompt text. Version numbers should generally not be changed after creation to preserve audit history.

### Deleting a Prompt

Click the **delete icon** to remove a prompt. Note that the **default prompt cannot be deleted**. If you need to remove the current default, first designate a different prompt as default, then delete the old one.

### Setting a Prompt as Default

Click the **star icon** on any prompt to make it the default. This takes effect immediately — all subsequent analyses run by Operators will use this prompt. Exercise caution when changing the default in a production environment; use the Evaluation page to validate a new prompt before promoting it.

---

## 4. Managing Training Examples

The **Training Examples page** manages the few-shot learning examples that are included in AI prompts. Each example consists of an image paired with structured detection results, teaching the model how to identify and count specific item types in warehouse conditions.

### Viewing Examples

The Training Examples page lists all examples in the system. Each entry shows the example image, its title, description, and whether it is currently **active** or **inactive**.

- **Active examples** are included in AI prompts during inference.
- **Inactive examples** are excluded from prompts but remain in the system.

### Adding a New Example

1. Click **"Add Example"**.
2. Upload an image that clearly shows the items you want the model to learn from.
3. Add one or more **detected item entries**. For each entry, specify:
   - **Item type** — the name/category of the item
   - **Count** — how many of this item are in the image
   - **Counting method** — e.g. individual units, pallets, boxes
4. Fill in a **title** and **description** for the example (used for internal reference).
5. Save the example. It will be active by default.

### Toggling Active/Inactive

Click the active/inactive toggle on any example to include or exclude it from prompts. This is useful for temporarily disabling examples that may be causing confusion for the model (e.g., if an example represents an item type no longer used in the warehouse) without permanently deleting them.

### Editing and Deleting Examples

- Use the **edit** action to update an example's image, detected item entries, title, or description.
- Use the **delete** action to permanently remove an example from the system.

> **Tip:** The quality of training examples matters significantly. Use clear, well-lit images that are representative of real warehouse conditions. Annotate counts accurately — incorrect few-shot examples will degrade model performance.

---

## 5. Using the Evaluation Page

The **Evaluation page** is the core tool for testing how different prompts and models perform on real images. It consists of a left configuration panel and a right results panel.

### Left Panel — Configuration

Set up your inference run using the following controls:

- **Prompt version selector** — choose which prompt to test.
- **Model selector** — choose which AI model to run inference with.
- **Image source** — choose one of two options:
  - **Upload new test image** — upload an image directly for this evaluation run.
  - **Select from existing analysis images** — opens a gallery of images previously uploaded by Operators. Using existing images is generally preferred as it allows consistent comparison across prompt versions.
- Click **"Run Inference"** to execute the analysis.

### Right Panel — Results

After inference completes, the results panel displays:

- **Detected items** — each item type found, with its count.
- **Confidence scores** — per-item confidence values from the model.
- **Image description** — a natural-language description of the image as interpreted by the model.

#### Saving a Result as a Training Example

Any detected item result can be saved directly as a training example. Click the **"Save as Training Example"** button on a result to create a new training example pre-populated with that image and the detected item data. Review and confirm the entry on the Training Examples page.

#### Comparing Two Inference Runs

After running inference once and then running a second inference on the same image (with different settings — for example, a different prompt version), a **"Compare"** toggle will appear. Enable it to display both result sets side-by-side. This is the primary tool for evaluating whether a prompt change has improved or degraded detection accuracy.

---

## 6. Recommended Workflow for Improving Accuracy

The following workflow is the standard process for iterating on prompt quality safely and systematically.

### Step 1 — Enable Testing Mode

Before doing any experimentation, turn on **Testing Mode** via the sidebar toggle. Confirm the amber banner is visible. This ensures none of your test runs pollute the live inventory.

### Step 2 — Establish a Baseline

1. Navigate to the **Evaluation page**.
2. Select **"Select from existing analysis images"** and choose an image that represents the problem you want to address (e.g., an image where the current prompt miscounts a specific item type).
3. Select the **current default prompt** and the target model.
4. Click **"Run Inference"** and carefully note the results — item types detected, counts, and confidence scores.

### Step 3 — Create a New Prompt Version

1. Navigate to the **Prompts page**.
2. Click **"New Prompt"** and create a new version with your proposed changes.
   - Be specific in the description about what you changed and why.
   - Keep changes incremental — modify one aspect at a time so you can isolate the effect of each change.
3. Save the new prompt (do not set it as default yet).

### Step 4 — Evaluate the New Prompt

1. Return to the **Evaluation page**.
2. Select the **same image** you used in Step 2.
3. Select your **new prompt version**.
4. Click **"Run Inference"**.

### Step 5 — Compare Results

Enable the **Compare toggle** to view the baseline results and the new results side-by-side. Assess whether the new prompt has improved accuracy:

- Are the correct item types being detected?
- Are the counts closer to the ground truth?
- Have confidence scores improved?
- Has accuracy improved on the target case without regressing on others?

If the results are not an improvement, return to Step 3 and iterate on the prompt.

### Step 6 — Promote to Default

Once you are satisfied that the new prompt performs better:

1. Navigate to the **Prompts page**.
2. Click the **star icon** on the new prompt version to set it as the default.
3. The new prompt is now active for all Operator uploads.

### Step 7 — Disable Testing Mode

Turn off **Testing Mode** via the sidebar toggle. Confirm the amber banner is no longer visible. The system is now operating normally with the improved prompt.

### Step 8 — Monitor Results

After deploying a new prompt, monitor the next round of Operator uploads via the Evaluation page or by reviewing recent uploads in the gallery. If you observe regressions, you can quickly revert by setting the previous prompt version back as the default.

---

### Additional Tips

- **Version naming:** Use a consistent versioning scheme (e.g. `v1`, `v1.1`, `v2`) and always write a meaningful description. This makes it easy to trace changes when diagnosing issues later.
- **Training example hygiene:** Periodically review the Training Examples page. Deactivate examples that are no longer relevant to your current inventory, as they consume prompt space and may confuse the model.
- **Incremental changes:** Avoid rewriting prompts entirely in a single iteration. Small, targeted changes are easier to evaluate and easier to roll back.
- **Use real images:** Always evaluate against actual warehouse images rather than synthetic test images. Real-world variation — lighting changes, partially obscured items, mixed pallets — is what the model needs to handle in production.

---

*For inventory management questions or alert configuration, contact your Supervisor.*
