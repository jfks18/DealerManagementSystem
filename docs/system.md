/*
SYSTEM DEFINITION: Motorcycle Branch Management System

STACK:
- Laravel (API backend)
- React (frontend)
- MySQL (database)

CORE CONCEPT:
This is a QUOTA-BASED performance tracking system.

Area Manager sets monthly quotas per branch.
Branch Managers input daily actual performance.

IMPORTANT BUSINESS RULE:
cash_units_quota = total_units_quota - installment_units_quota
DO NOT store computed values in database.

FEATURES:
- Branch management
- Monthly quota setup
- Daily reporting
- Sales tracking (cash vs installment)
- Parts sales tracking
- Labor charge tracking
- CPN / Non-CPN service tracking
- Area Manager dashboard with branch comparison
- Monthly history per branch
*/