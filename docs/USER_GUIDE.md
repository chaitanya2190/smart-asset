# Stage 4: User Guide

Welcome to the **Smart Corporate Equipment & Asset Reservation System**. This platform allows employees to securely reserve corporate equipment (laptops, cameras, monitors) for temporary checkout.

## 1. Viewing Available Assets
When you open the application, you will see the **Available Equipment** catalog on the left side of your screen.
- Each asset card displays the **Asset Name**, its **Current Status** (Available or Maintenance), and the **Maximum Duration** you are allowed to check it out for.
- Assets currently marked in red as `MAINTENANCE` cannot be reserved. The reserve button will be disabled.

## 2. Making a Reservation
1. Find the equipment you need and click the purple **Reserve** button.
2. A popup modal will appear on your screen.
3. Select your **Start Date** (when you plan to pick it up) and your **End Date** (when you will return it). 
   *Note: You cannot select a date in the past, and your end date must be after your start date.*
4. Click **Confirm Reservation**.
5. If the dates are valid, the asset is available, and you haven't exceeded your quota limit (max 2 active reservations), the reservation will be approved! 
6. A success notification will appear, and the reservation will show up on the right panel.

## 3. Exceeding Quota
If you already have 2 active reservations and you attempt to book a 3rd item, the system will not block you completely. Instead, it will create your reservation but flag it as **PENDING_APPROVAL**. An administrator will need to manually review and approve this exception.

## 4. Cancelling a Reservation
Plans changed? You can easily cancel your reservation to free up the asset for your colleagues.
1. Look at the **Your Active Reservations** panel on the right side of the screen.
2. Find the reservation you wish to cancel.
3. Click the red **Cancel** button.
4. Confirm your choice in the browser prompt.
5. The reservation will be immediately cancelled and removed from your active list, returning the asset to the available pool.
