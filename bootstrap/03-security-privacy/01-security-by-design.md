# Security by design

Security is a continuous engineering requirement, not an end-stage audit.

## For every material change

- identify assets, actors, and trust boundaries;
- validate untrusted input at system boundaries;
- implement authorization explicitly;
- apply least privilege;
- keep secrets out of source code and logs;
- minimize dependencies and use intentional versions;
- test negative cases and predictable abuse paths;
- record residual risk and risk-acceptance decisions.

## Limit

Tests, SAST, and SCA reduce risk. They do not prove a system is secure.
