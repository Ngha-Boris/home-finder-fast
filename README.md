# Home Finder Hub

Build an MVP: House Finding Platform

Build a modern, mobile-first house-finding web application for users looking for rental houses and landlords who want to list and manage their properties.

The goal is to build a working MVP, not just a visual prototype. The application should have a clean architecture, responsive UI, authentication for landlords, public house browsing without user accounts, image uploads, search/filtering, and a caching/offline-first strategy.

1. Product Concept

The platform connects:

House seekers

House seekers do not need to create an account or log in.

They can:

Browse available houses

Search for houses

Filter houses by rent price

Filter by house type

View house details

View multiple house photos

Call the landlord directly

Contact the landlord through WhatsApp

Landlords

Landlords have their own accounts.

They can:

Register

Log in

Access their private dashboard

Add houses

Upload multiple photos

View their listings

Edit listings

Delete listings

Mark listings as available/unavailable

Manage their own profile/contact information

A landlord must never be able to access another landlord's listings or dashboard data.

2. Technology & Architecture

Use a modern full-stack architecture suitable for an MVP.

Preferred stack:

React

TypeScript

Tailwind CSS

Supabase for database, authentication, and storage

PostgreSQL through Supabase

Progressive Web App (PWA) capabilities

Browser/device caching for frequently accessed house listings

Responsive design for mobile, tablet, and desktop

If Lovable has a better native architecture for implementing the same requirements, use it, but keep the application simple and maintainable.

3. IMPORTANT: Offline-First / Caching Strategy

A major requirement is that the application should feel fast even when the network is slow.

Implement an offline-first caching layer between the browser/device and the database.

The desired flow is:

User opens application
        ↓
Check local cache
        ↓
Display cached houses immediately if available
        ↓
Fetch latest data from backend/database
        ↓
Update local cache
        ↓
Update UI with fresh data


The user should not have to wait for the database request before seeing previously cached listings.

Requirements

Use an appropriate browser storage mechanism such as IndexedDB.

Cache:

House listings

House photos/URLs where practical

Search/filterable house metadata

Basic landlord/public contact information required for house details

When the application starts:

Load cached listings immediately.

Render them.

In the background, request the latest listings from the backend.

Update the cache with fresh data.

Update the UI if there are changes.

If there is no internet connection:

Continue showing cached listings.

Allow users to browse cached houses.

Show a subtle "Offline" indicator.

Do not show a blank page or loading screen if cached data exists.

When the internet connection returns:

Automatically synchronize fresh data.

Important

Do not implement caching in a way that creates stale or incorrect landlord data.

Landlord CRUD operations should require an active connection unless a reliable offline mutation queue is implemented.

For the MVP, prioritize:
offline browsing + cached house discovery over offline landlord CRUD.

4. User Roles

Implement two main roles.

Public User

No authentication.

Permissions:

View houses

Search

Filter

View house details

Call landlord

Open WhatsApp contact

Cannot:

Add houses

Edit houses

Delete houses

Access landlord dashboard

Landlord

Authenticated user.

Permissions:

Register

Login

Logout

Access landlord dashboard

Create listings

Read own listings

Update own listings

Delete own listings

Upload listing photos

A landlord can only access records where they are the owner.

Use Supabase Row Level Security (RLS) to enforce this at the database level, not just in the frontend.

5. Pages / Routes

Create the following pages.

Public Pages

/

Landing page

/houses

House browsing page

/houses/:id

House details page

/landlord/login

Landlord login

/landlord/register

Landlord registration

Private Landlord Pages

/landlord/dashboard

Landlord dashboard

/landlord/listings

Landlord's listings

/landlord/listings/new

Create listing

/landlord/listings/:id/edit

Edit listing

6. Landing Page

Create a visually attractive landing page.

The landing page should contain:

Hero section

A strong headline explaining the product.

Example concept:

"Find your next home, faster."

Supporting text explaining that users can discover available rental houses and contact landlords directly.

Include a prominent search bar.

Search should allow users to search by:

Location/region

House type

Keywords

Include two main actions:

Browse Houses

and

Add a House

"Add a House" should take the user to the landlord registration/login flow.

Recent Listings

Display the 8 most recent available houses maximum.

Each listing card should show:

Main image

House type

Rent price

Location

Short description

Availability

View Details button

Sort by newest listings first.

How It Works

Add a simple three-step explanation:

Search for a house

View the property

Contact the landlord

Call to Action

Add a section encouraging landlords to list their properties.

CTA:

"Have a house to rent?"

Button:

"Add Your House"

7. House Browsing Page

Route:

/houses

This is the main discovery page.

Users should see all currently available houses.

Search

Include a prominent search input.

Search should work against:

Location

Description

House type

Relevant listing text

Use debounced search so that the UI remains responsive.

Filters

Users should be able to filter by:

House Type

Studio Apartment

Single Room

Structure this so additional types can easily be added later.

Rent Price

Allow:

Minimum rent

Maximum rent

Optionally provide quick price ranges.

Region / Location

Allow users to select or search their region.

Listing Cards

Each card should show:

Property image

House type

Rent

Location

Short description

Date listed

Availability

"View Details"

Clicking a card should navigate to:

/houses/:id

Empty State

If there are no matching houses, display a friendly message such as:

"No houses match your search."

Include a button to clear filters.

8. House Details Page

Route:

/houses/:id

This page should provide complete information about a property.

Image Gallery

Display all uploaded images.

The user should be able to:

Swipe through images on mobile

Click images

Open a larger image viewer/lightbox

The first image should be the main property image.

Property Information

Display:

House type

Rent price

Location

Description

Availability

Date listed

If appropriate, include additional fields such as:

Number of rooms

Bathroom information

Water availability

Electricity availability

Neighborhood/location description

Keep the MVP data model flexible so these fields can be expanded later.

Landlord Contact

Display the landlord's public contact number.

Provide two prominent buttons:

Call Landlord

Use a tel: link.

When clicked, it should open the user's phone calling interface.

Chat on WhatsApp

Use a WhatsApp deep link.

Format the phone number correctly for WhatsApp.

The WhatsApp button should open WhatsApp with the landlord's number.

Do not expose private landlord account information.

9. Landlord Registration

Route:

/landlord/register

The landlord should register using:

Phone number

Password

Confirm password

The requirement is that the landlord uses a 9-digit phone number.

Validate the phone number.

Important:

Store phone numbers in a normalized format so that calling and WhatsApp links can be generated reliably.

Do not store passwords manually in the database.

Use Supabase Auth or another secure authentication mechanism.

If Supabase Auth requires a different credential format, design the authentication flow so the user experience still centers around the landlord's phone number.

10. Landlord Login

Route:

/landlord/login

The page should contain:

Phone number

Password

Login button

Also provide:

"Don't have an account? Register"

Link to:

/landlord/register

Include:

Loading state

Validation errors

Incorrect credentials error

Successful login redirect

After successful login:

Redirect to:

/landlord/dashboard

11. Landlord Dashboard

Create a private dashboard.

The dashboard should show:

Summary cards

Total Listings

Available Listings

Unavailable Listings

Recent Listings

Show the landlord's latest listings.

Each listing should have:

Image

House type

Rent

Location

Availability

Edit button

Delete button

View button

Include:

+ Add House

button.

12. Add House

Route:

/landlord/listings/new

Create a form for adding a property.

Fields:

Required

House type

Rent price

Region/location

Description

Landlord contact phone

At least one photo

Optional

Number of rooms

Bathrooms

Water availability

Electricity availability

Additional amenities

Additional location details

House type options:

Studio Apartment

Single Room

Availability:

Available

Unavailable

13. Image Upload

Landlords should be able to upload multiple house photos.

Requirements:

Multiple image selection

Image preview before submission

Remove image before uploading

Upload progress

Main/cover image

Maximum reasonable image size

Client-side image compression/resizing where appropriate

Store images in Supabase Storage.

Do not store image binary data directly inside PostgreSQL.

Store image URLs/paths in the database.

14. Edit House

Landlords should be able to edit their own listings.

They should be able to:

Change price

Change location

Change description

Change house type

Change availability

Add photos

Remove photos

Change the main image

Only the listing owner can perform these operations.

15. Delete House

Allow landlords to delete their own listings.

Before deletion, display a confirmation dialog:

"Are you sure you want to delete this listing?"

Deleting a listing should also handle its associated images appropriately.

16. Database Design

Create a clean relational schema.

Suggested tables:

profiles

id
phone_number
role
created_at
updated_at


Roles:

landlord
admin


houses

id
landlord_id
house_type
rent_price
region
location
description
availability
created_at
updated_at


house_images

id
house_id
image_url
storage_path
is_cover
created_at


Potential future fields can be added without breaking the architecture.

Create appropriate indexes for:

region

house_type

rent_price

availability

created_at

landlord_id

17. Database Security

This is extremely important.

Implement Supabase Row Level Security.

Public users

Can read houses that are:

availability = available


and their associated public images.

They should NOT be able to modify houses.

Landlords

Can:

Create houses

Read their own houses

Update their own houses

Delete their own houses

They must NOT be able to access another landlord's private data.

Enforce ownership using:

houses.landlord_id = authenticated user's id


Do not rely only on frontend checks.

18. Admin Page

Create a basic admin page.

Route:

/admin

The admin should eventually be able to manage the platform.

For the MVP, implement:

Admin authentication/authorization

View all listings

View all landlords

Delete inappropriate listings

Mark listings unavailable

Basic platform statistics

Admin access must be protected using role-based authorization.

A normal landlord must not be able to access /admin.

19. Performance Requirements

The application should feel fast.

Implement:

Lazy loading of images

Responsive image sizes

Image compression

Pagination or infinite scrolling where appropriate

Debounced search

Database indexes

Local caching

Skeleton loading states

Optimistic UI where safe

Avoid unnecessary API calls

Cache recently viewed listings

Cache the main house listing feed

Do not download every full-resolution image when displaying listing cards.

Use thumbnails/responsive image sizing where possible.

20. Offline Behavior

The app should behave like a lightweight PWA.

Add:

Service worker

App shell caching

IndexedDB for house listing data

Offline detection

Cached house browsing

When offline:

Offline
  ↓
Load cached houses
  ↓
User can browse cached houses
  ↓
User can open cached house details


If a user tries to perform a landlord operation while offline:

Display:

"This action requires an internet connection."

Do not silently lose data.

21. UI / UX Design

The application should feel modern, trustworthy, and easy to use.

Design principles:

Mobile-first

Clean layout

Simple navigation

Large touch-friendly buttons

Strong property photography

Clear rent prices

Clear location information

Minimal unnecessary UI

Fast loading experience

Use cards for house listings.

Each listing should make the following information immediately visible:

[House Image]

Studio Apartment
50,000 FCFA / month

Location
Short description

[View Details]


Use appropriate icons for:

Location

Price

House type

Phone

WhatsApp

Photos

22. Navigation

Public navigation:

Logo
Houses
Add House


Mobile navigation should be simple and touch-friendly.

Landlord navigation:

Dashboard
My Listings
Add House
Profile
Logout


Admin navigation:

Dashboard
Listings
Landlords
Logout


23. Loading & Error States

Every asynchronous operation must have proper UI states.

Implement:

Loading

Skeleton loaders rather than blank screens.

Error

Friendly error message with retry button.

Empty

Helpful empty-state message.

Offline

Clearly communicate when the user is viewing cached/offline data.

24. Form Validation

Validate all forms.

Examples:

Required fields

Valid phone number

Valid rent amount

Password minimum length

Password confirmation

Image file type

Image size

House type

Valid listing data

Show validation messages directly beside the relevant field.

25. Production Data

Use real landlord-created listings only.

This should allow us to test:

Search

Filters

House details

Pagination/caching

Landlord ownership

CRUD

26. Important MVP Scope

Do NOT over-engineer the first version.

The priority is:

Public house browsing

Search and filters

House details

Call landlord

WhatsApp contact

Landlord registration/login

Landlord dashboard

House CRUD

Multiple image uploads

Database security

Offline/cache-first house browsing

Basic admin management

Do not add unnecessary features such as:

User accounts for house seekers

In-app messaging

Payments

Subscriptions

Complex recommendation algorithms

Maps unless necessary

Reviews/ratings

Notifications

Advanced analytics

These can be added later.

27. Acceptance Criteria

The MVP is considered complete when:

Public user

Can open the website without creating an account

Can see recent houses on the landing page

Can browse all available houses

Can search houses

Can filter by rent

Can filter by house type

Can open a house details page

Can view all house photos

Can call the landlord

Can open WhatsApp to contact the landlord

Can browse previously cached houses while offline

Landlord

Can register

Can log in

Can log out

Has a private dashboard

Can add a house

Can upload multiple photos

Can see their own listings

Can edit their listings

Can delete their listings

Can change listing availability

Cannot access another landlord's listings

Admin

Admin can securely log in

Admin can view all listings

Admin can view landlords

Admin can remove/disable listings

Normal landlords cannot access admin functionality

Performance

Cached houses display immediately when available

Fresh data is fetched in the background

Cache is updated after successful synchronization

App works as a PWA

App provides useful offline behavior

Images are optimized

Loading states are implemented

28. Development Approach

Build this in logical stages:

Stage 1

Set up project structure, Supabase, database schema, authentication, and RLS.

Stage 2

Build the public landing page and house browsing page.

Stage 3

Build house details and contact functionality.

Stage 4

Build landlord registration/login and dashboard.

Stage 5

Build landlord listing CRUD and image uploads.

Stage 6

Build admin functionality.

Stage 7

Implement caching, IndexedDB, service worker, PWA, and offline browsing.

Stage 8

Optimize performance, responsiveness, validation, error states, and UX.

After each stage, ensure the existing functionality continues to work.

29. Important Implementation Instruction

Do not only create static frontend screens.

Build the MVP as a functional full-stack application with:

Working database

Working authentication

Working CRUD

Working image storage

Working permissions/RLS

Working search/filtering

Working phone links

Working WhatsApp links

Working cache/offline browsing

Keep the code modular and easy to extend.

Before considering the MVP complete, test the complete flows from both perspectives:

Anonymous house seeker

Authenticated landlord

Admin

Pay particular attention to security: a landlord must never be able to manipulate another landlord's listings by changing an ID in the URL or API request.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/bc6f57d4-ad64-42ea-a05f-0660fff5f5f0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
