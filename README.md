# CereVA
CereVA is an uncertainty visual analytics framework for fMRI functional connectivity. The implementation here works largely as described in An uncertainty visual analytics framework for fMRI functional connectivity (under review). In the preparation and development for that paper, confidential, ethics-protected patient data was used. All traces of that data have been removed from the code here, however some of the smaller aspects and features described in the paper may be broken or missing. The two two examples provided are simulation data created to illustrate how the components fit together. To run the software, download all the files and place them into a web server. For quick testing, the http-server package within nodejs is recommended.

Known issues:

-The small multiples mode was heavily tied to the confidential data for speed reasons. As a result, it broke during the uncoupling. A quick replacement has been added that allows 4 graphs to be loaded (by clicking the settings in the top right and Small Multiples). However, full interaction has not yet be (re)set up.

-In the matrix view, the interaction has some issues for similar reasons.

-The colour picker was accidentally lost somewhere in the changes. This should be a quick fix.
