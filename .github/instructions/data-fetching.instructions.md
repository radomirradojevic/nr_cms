---
description: Read  this file to understand how to fetch data in this project.
---
# Data Fetching guidelines
This document outlines the guidelines for fetching data in our Next.js project. It covers best practices, recommended libraries, and common patterns to ensure efficient and maintainable data fetching.

## 1. Use Server-Side components for data fetching
When you need to fetch data from external APIs or databases ALWAYS use Server components with `getServerSideProps`. This allows you to fetch data on the server side and pass it as props to your components, ensuring that the data is available when the page is rendered. NEVER use Client components for data fetching.

## 2. Data fetching methods
ALWAYS use helper functions in the /data directory to fetch data. NEVER fetch data directly in the components.

ALL helper functions in /data directory should use drizzel-orm to fetch data from the database.

