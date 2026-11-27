# YouTube-story tirsdag og lørdag

Godkendt af Morten 27/11-2026 (billedet og planen). Undermappe, fordi plan/ i forvejen bruges til andre funktioner.

## Hvad den skal kunne
- Tirsdag og lørdag kl. 9 lægges en YouTube-story ud i stedet for elstoryen.
  Mandag, onsdag, fredag og søndag er der stadig benzin. Torsdag er der stadig el.
- Storyen viser den nyeste video fra kanalen @MrMesserschmidt: videoens eget billede og titel.
- Teksten på billedet (godkendt af Morten):
  - Øverst: »Følg Morten Messerschmidt på YouTube«
  - »DENNE UGES AFSNIT:« og videoens billede med afspilningsknap
  - Videoens titel (uden smiley-tegn)
  - »Nye film hver søndag« og »Noget andet end de hurtige klip på Facebook«
  - Nederst en rød knap med youtube.com/@MrMesserschmidt
- Samme billede (1080×1920) til Facebook-story og Instagram-story, som de andre stories.

## Reserve
- Er der ingen ny video, lægges dagens elstory ud i stedet. »Ny« betyder: højst 7 dage gammel og ikke
  brugt i en tidligere YouTube-story.
- Kan feedet ikke hentes, gælder det samme.
- 1. december 2026 er en tirsdag. Der gælder 2-kroners-storyen først, og dens reserve er el (ikke YouTube).

## Sikkerhed
- Typen `youtube` lægges kun ud, når den står i FACEBOOK_GODKENDT, også når resten er live.
  Indtil da vises den kun på kladdesiden (billedadressen med ?udkast=1), og elstoryen lægges ud.
- Videoen markeres som brugt, før Meta kaldes: den samme video bliver aldrig til to YouTube-stories.
- Ingen betaling, ingen persondata, ingen automatiske svar.

## Kilde
- YouTubes åbne feed (samme som /api/seneste). Kanal-id kan overstyres med YT_KANAL i Vercel.
