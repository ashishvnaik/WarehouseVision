# WarehouseVision — Operator Manual

**Role:** Warehouse Operator
**Version:** 1.0
**Last Updated:** March 2026

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Step-by-Step Upload Guide](#2-step-by-step-upload-guide)
3. [Understanding Quality Feedback](#3-understanding-quality-feedback)
4. [My Uploads Page](#4-my-uploads-page)
5. [Troubleshooting](#5-troubleshooting)

---

## 1. Getting Started

Welcome to WarehouseVision! Your job in this app is simple: take photos of the warehouse and upload them so the AI can count inventory for you. No technical knowledge is required — this manual will walk you through everything.

### Logging In

1. Open WarehouseVision in your browser or on your device.
2. On the login page, use the **role selector** to choose **Operator**.
3. Enter your Operator password in the password field.
4. Click **Log In**. You will land directly on the **Upload page**.

> **Note:** Ask your supervisor for your Operator password if you don't have one.

### Pages Available to You

As an Operator, you have access to two pages:

- **Upload page** — where you upload warehouse photos for AI analysis (this is your main workspace).
- **My Uploads page** — where you can review all photos you've uploaded during your current session.

---

## 2. Step-by-Step Upload Guide

### Step 1 — Set the Photo Date

At the top of the Upload page, you'll see a **Photo Date** field. This should be set to the date the photo was actually taken.

- If you're uploading a photo taken today, the date will already be correct (it defaults to today).
- If you're uploading a photo from an earlier date, change the date to match when the picture was taken — not today's date.

> **Why does this matter?** The date is used to track inventory counts over time. Using the wrong date will put the count in the wrong place in the history.

### Step 2 — Select a Detection Model

Use the **Detection Model** dropdown to choose which AI model will analyse your image. If you're not sure which to pick, use whichever model is selected by default or ask your supervisor.

### Step 3 — Upload Your Image

You have two options for adding your photo:

- **Drag and drop:** Drag an image file from your device directly onto the upload zone on the screen.
- **Take a photo:** Click the **"Take Photo"** button to open your device camera and take a picture right away.

Once your image is loaded, you'll see a preview in the upload zone.

### Step 4 — Run the Analysis

Click the **"Start Analysis"** button. The AI will process your image and detect items in the warehouse. This usually takes a few seconds.

### Step 5 — Review the Results

Once the analysis is complete, the **Image Quality Feedback** panel will appear below the upload zone. Review the results carefully before you're done — see the next section for a full explanation of what each part means.

---

## 3. Understanding Quality Feedback

After an analysis runs, the Image Quality Feedback panel shows you how well the AI was able to read your photo. Here's what each part means:

### Clarity Badge

This tells you how sharp and clear the image is.

- **Green "Clear"** — The image is sharp enough for confident detection.
- **Amber "Blurry — low confidence detected"** — The image is too blurry and the AI is less certain about what it found.

### Coverage Badge

This tells you whether the AI thinks items may have been cut off at the edges of the photo.

- **Green "Good coverage"** — The items appear to be fully in frame.
- **Amber "Some items may be cut off"** — Part of the warehouse shelves or items may be outside the photo.

### Overall Quality Score

This is the summary rating for your image:

| Score | Colour | What it means |
|-------|--------|---------------|
| Good  | Green  | Image is suitable. Results have been saved to inventory. |
| Fair  | Amber  | Image has some issues. Results may be less accurate. |
| Poor  | Red    | Image is not suitable. You should retake and re-upload. |

### Actionable Message

Below the score, you'll see a plain-language message telling you what to do next. For example:

- "Image looks great. Results saved to inventory." — You're done, no action needed.
- "Image quality is too low. Please retake and re-upload." — The photo needs to be redone.

### Detected Items List

This read-only list shows every item type the AI found in your photo, along with the count for each. You cannot edit this list — if the results look wrong, use the **Retake** button or speak to your supervisor.

### Retake Button

The **Retake** button appears when the quality score is **Fair** or **Poor**. Clicking it clears the results and resets the form so you can upload a new photo. The original upload is discarded.

### Delete Image Button

The **Delete Image** button removes this upload and its counts from the database. Use this if you realise you uploaded the wrong photo (for example, a photo of the wrong area or from the wrong date).

---

## 4. My Uploads Page

The **My Uploads** page keeps a record of every photo you've uploaded during your current login session.

### What You'll See

Each upload appears as a card showing:

- A thumbnail of the photo
- The timestamp of when you uploaded it
- A summary of the items detected
- The quality badge (Good / Fair / Poor)

### Deleting an Upload

Each card has a **Delete** button. Clicking it removes that upload and its counts from the database. Use this if you notice a mistake after leaving the Upload page.

### Session Reset

Your uploads list is **cleared automatically when you log out**. The next time you log in, you start with a fresh, empty list. Your uploads are still saved in the inventory database — this page is just your personal session view.

---

## 5. Troubleshooting

### The analysis says "Blurry" but I thought the photo looked fine

Blurriness is detected by the AI based on fine details in the image. Even if a photo looks acceptable on your phone screen, it may not have enough detail for accurate counting. Try the following:

- Hold the camera steady when taking the photo.
- Make sure the lens is clean.
- Ensure there is enough light — dim lighting often causes blur.
- Step back slightly if you are very close to the shelves.

### The coverage badge says "Some items may be cut off"

This means the AI thinks the edges of the photo may be missing items. To fix this:

- Step back further from the shelves so the whole area fits in the frame.
- Make sure shelves are not partially cut off at the top or sides.

### The detected items look wrong

The detected items list is read-only and you cannot correct it yourself. If the results look clearly incorrect:

- Check the quality score — if it's Fair or Poor, use the **Retake** button and try again with a better photo.
- If the quality score is Good but results still seem wrong, let your supervisor know so they can investigate.

### I uploaded the wrong photo

Use the **Delete Image** button on the Upload page immediately after analysis, or find the upload on the **My Uploads** page and click the **Delete** button there. This will remove the incorrect counts from the inventory database.

### I can't log in

- Make sure you have selected **Operator** in the role selector before entering your password.
- Double-check that you're typing the password correctly (passwords are case-sensitive).
- Contact your supervisor if the problem continues.

### The "Take Photo" button doesn't open the camera

- Make sure your browser or the app has permission to access your camera.
- On a mobile device, check your device's privacy settings and allow camera access for your browser.
- If you cannot use the camera, take the photo with your phone's camera app first and then use drag-and-drop to upload the saved file.

---

*For further assistance, contact your Supervisor.*
