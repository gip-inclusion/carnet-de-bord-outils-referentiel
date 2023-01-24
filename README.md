# carnet-de-bord-outils-referentiel
Des scripts pour facilier la maintenance du référentiel

## Générer les migrations pour la mise à jour du référentiel

Remplir le fichier [./referentiel.xlsx](./referentiel.xlsx) avec les items du référentiel à modifier.
Pour chaque ligne, indiqueri :
    - le thème. Cela peut être le titre - "Contraintes familiales" ou l'identifiant - "contraintes_familiales" ;
    - le type parmi `SITUATION`, `OBJECTIF`, `ACTION` ;
    - l'ancienne valeur. Cette colonne est vide en cas d'ajout ;
    - l'action à faire parmi `modifier` / `fusionner` / `ajouter` / `supprimer`. Une valeur vide fera que la ligne sera ignorée ;
    - la nouvelle valeur.

Une fois le fichier à jour, lancer le script avec
```
node ./index.js
```

Les migrations sont ensuite envoyées sur la sortie standard.

Il est possible de redigiré la sortie vers un fichier avec
```
node ./index.js > fichier.sql
```

Sur macos, on peut envoyer la sortie dans le presse-papier avec
```
node ./index.js | pbcopy
```

Cela permet de coller les migrations dans l'onglet SQL de Hasura pour laisser Hasura générer un fichier de migration automatiquement.
