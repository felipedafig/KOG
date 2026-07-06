/* One-shot Dutch -> English translator for the KOG mirror.
 * Matches each block-leaf element's full (whitespace-normalised, lowercased)
 * text against MAP and replaces it. Leaves company name, address, phone,
 * email, KvK number intact. Run: node translate.js
 */
const fs = require('fs'), path = require('path'), cheerio = require('cheerio');
const ROOT = 'kogonderhoud.nl';

// Dutch (natural case) -> English. Keys are lowercased+whitespace-collapsed at load.
const MAP = {
  // ---- Nav / menu / sidebar / section headings ----
  'Voor Bewoners': 'For Residents',
  'Voor bewoners': 'For Residents',
  'Terug bel verzoek': 'Call-back Request',
  'Project bij u in de buurt': 'Project Near You',
  'Service Dagelijks Onderhoud': 'Daily Maintenance',
  'Dagelijks onderhoud': 'Daily Maintenance',
  'Planmatig onderhoud': 'Planned Maintenance',
  'Werkzaamheden bij u in de buurt': 'Work in Your Area',
  'Duurzaam wonen': 'Sustainable Living',
  'Energiezuinig glas': 'Energy-efficient Glazing',
  'Verduurzaming van uw dak': 'Roof Sustainability',
  'Sectoren': 'Sectors',
  'Vve / Beheer': 'HOAs / Management',
  'Woningcorporaties': 'Housing Associations',
  'Zakelijke markt': 'Business Market',
  'Particuliere markt': 'Private Market',
  'Disciplines': 'Disciplines',
  'Bouw en renovaties': 'Construction & Renovation',
  'Bouw en renovatie': 'Construction & Renovation',
  'Schilderwerk': 'Painting',
  'Dakwerkzaamheden': 'Roofing',
  'Elektrotechniek': 'Electrical',
  'Hoogwerker Service': 'Aerial Platform Service',
  'Gootonderhoud & reiniging op hoogte': 'Gutter Cleaning at Height',
  'Dakinspectie & dakonderhoud': 'Roof Inspection & Maintenance',
  'Bouwinspecties & begeleiding': 'Building Inspections & Supervision',
  'Contact': 'Contact',
  'Contactgegevens': 'Contact Details',
  'Werken bij': 'Careers',
  'Klacht of compliment': 'Complaint or Compliment',

  // ---- Footer ----
  'Alles onder één dak!': 'Everything under one roof!',
  'Social media': 'Social media',
  'Voor onze laatste updates volg ons op instagram!': 'Follow us on Instagram for our latest updates!',
  '20+ jaar ervaring': '20+ years of experience',
  'Specialist in vastgoedonderhoud': 'Specialist in property maintenance',
  'Actief voor VvE’s, Woningcorporaties en Vastgoedbeheerders.': 'Working for HOAs, housing associations and property managers.',
  "Actief voor VvE's, Woningcorporaties en Vastgoedbeheerders.": 'Working for HOAs, housing associations and property managers.',

  // ---- Homepage ----
  'Kiest u voor onderhoud vandaag, dan bespaart u morgen hoge kosten!': 'Choose maintenance today and avoid high costs tomorrow!',
  'Dé onderhoudspartner voor uw vastgoed': 'The maintenance partner for your property',
  'KOG Onderhoud is dé partner voor VvE’s, woningcorporaties en vastgoedbeheerders in Noord-Holland. Wij verzorgen professioneel onderhoud, renovatie en verduurzaming met oog voor kwaliteit, veiligheid en een duurzame toekomst.': 'KOG Onderhoud is the partner for HOAs, housing associations and property managers in North Holland. We provide professional maintenance, renovation and sustainability upgrades with an eye for quality, safety and a sustainable future.',
  'Van dagelijks onderhoud tot grotere projecten: wij staan klaar met een betrokken team en een praktische aanpak.': 'From daily maintenance to larger projects: we are ready to help with a committed team and a practical approach.',
  '"Omdat het onderhouden van wat al bestaat net zo waardevol is als het creëer van iets nieuws!"': '"Because maintaining what already exists is just as valuable as creating something new!"',
  'Vandaag onderhouden is in de toekomst investeren!': 'Maintaining today is investing in the future!',
  'Welkom bij Kortlevers Onderhoud Groep, uw partner in onderhoud en schilderwerkzaamheden. Met vakmanschap en oog voor detail zorgen wij dat uw pand of woning niet alleen straalt, maar ook zijn waarde behoudt.': 'Welcome to Kortlevers Onderhoud Groep, your partner in maintenance and painting work. With craftsmanship and an eye for detail, we make sure your property or home not only looks its best but also retains its value.',
  'Of het gaat om schilderwerk, houtrotpreventie of periodiek onderhoud: wij leveren duurzame kwaliteit waar u jarenlang plezier van heeft.': 'Whether it concerns painting, wood-rot prevention or periodic maintenance: we deliver durable quality that you will enjoy for years to come.',
  'Neem gerust contact met ons op voor een vrijblijvend advies!': 'Feel free to contact us for no-obligation advice!',
  'Direct contact opnemen': 'Contact us now',

  // ---- Hero (added earlier, was Dutch) ----
  'Onderhoudspartner voor VvE’s, Woningcorporaties en vastgoedbeheerders in Noord-Holland': 'Maintenance partner for HOAs, housing associations and property managers in North Holland',
  'Professioneel onderhoud, renovatie en verduurzaming — met oog voor kwaliteit, veiligheid en een duurzame toekomst.': 'Professional maintenance, renovation and sustainability upgrades — with an eye for quality, safety and a sustainable future.',

  // ---- Sign-in ----
  'Inloggen': 'Sign in',

  // ---- Contact / Contactgegevens ----
  'Kantoor': 'Office',
  'Bezoekgegevens': 'Visiting address',
  'Administratieve gegevens': 'Administrative details',
  'Administratie': 'Administration',
  'Postbus 37033 1033 AA Amsterdam': 'P.O. Box 37033, 1033 AA Amsterdam',
  'KVK-nummer 58125507': 'Chamber of Commerce no. 58125507',
  '1948 RC Beverwijk': '1948 RC Beverwijk',

  // ---- Klacht of compliment ----
  'Bij ons staat klanttevredenheid centraal. Daarom horen wij graag hoe u onze dienstverlening heeft ervaren. Bent u tevreden over onze werkzaamheden of de service van onze medewerkers? Dan waarderen wij uw compliment enorm. Uw positieve feedback motiveert ons om iedere dag kwaliteit te blijven leveren.': 'Customer satisfaction is central to what we do. That is why we would love to hear how you experienced our service. Are you happy with our work or the service of our staff? Then we greatly appreciate your compliment. Your positive feedback motivates us to keep delivering quality every day.',
  'Heeft u een klacht of bent u ergens niet tevreden over? Laat het ons dan weten. Wij nemen iedere melding serieus en zoeken samen met u naar een passende oplossing. Door uw feedback kunnen wij onze dienstverlening blijven verbeteren.': 'Do you have a complaint or are you dissatisfied about something? Please let us know. We take every report seriously and work together with you to find a suitable solution. Your feedback helps us keep improving our service.',
  'Stuur uw klacht of compliment gerust per e-mail naar info@kogonderhoud.nl': 'Feel free to send your complaint or compliment by email to info@kogonderhoud.nl',
  'Vermeld daarbij indien mogelijk uw naam, adres, telefoonnummer en een korte omschrijving van uw ervaring of melding. Zo kunnen wij u sneller en beter van dienst zijn.': 'Where possible, please include your name, address, telephone number and a short description of your experience or report. This allows us to help you faster and better.',
  'Wij nemen uw bericht zo snel mogelijk in behandeling en streven ernaar om binnen enkele werkdagen contact met u op te nemen.': 'We will process your message as soon as possible and aim to contact you within a few working days.',
  'Samen werken we aan een optimale service. Bedankt voor uw reactie!': 'Together we work towards the best possible service. Thank you for your response!',

  // ---- Werken bij ----
  'Vacatures – Kom jij ons team versterken?': 'Vacancies – Will you join our team?',
  'Wij zijn een groeiend en enthousiast bedrijf en we zijn op zoek naar leuke, gemotiveerde collega’s die samen met ons het verschil willen maken. Werk jij graag in een hecht team waar kwaliteit, service en een goede sfeer centraal staan? Dan zoeken wij jou!': 'We are a growing and enthusiastic company looking for motivated colleagues who want to make a difference together with us. Do you enjoy working in a close-knit team where quality, service and a good atmosphere come first? Then we are looking for you!',
  'Administratief medewerker (24 uur)': 'Administrative assistant (24 hours)',
  'Ben jij georganiseerd, klantvriendelijk en houd je van overzicht?': 'Are you organised, customer-friendly and do you like keeping things in order?',
  'Voor ons kantoor zoeken wij een collega voor 24 uur per week. In deze functie ben jij een belangrijke schakel tussen klanten, bewoners en onze collega’s in het veld.': 'For our office we are looking for a colleague for 24 hours per week. In this role you are an important link between clients, residents and our colleagues in the field.',
  'Wat ga je doen?': 'What will you do?',
  'Contact onderhouden met klanten en bewoners': 'Maintaining contact with clients and residents',
  'Inplannen en coördineren van afspraken': 'Scheduling and coordinating appointments',
  'Administratieve ondersteuning': 'Administrative support',
  'Zorgen dat alles op rolletjes loopt': 'Making sure everything runs smoothly',

  // ---- Disciplines: bouw en renovaties ----
  'Wij zijn een aannemer gespecialiseerd in renovatiebouw, mutatiebouw, nieuwbouw en woningbouw.': 'We are a contractor specialising in renovation, turnover works, new-build and residential construction.',
  'Wij zorgen voor een uitgebreide afwerking van appartementen, huizen, kantoren, maar ook voor renovatie en aanpassing van kamers zoals zolders en kelders.': 'We provide a full finishing of apartments, houses and offices, as well as the renovation and adaptation of spaces such as attics and basements.',
  'Wij voeren opdrachten uit van particulieren, maar ook van bedrijven en andere instellingen.': 'We carry out work for private individuals as well as for companies and other organisations.',
  'Renovaties': 'Renovations',
  'Badkamerrenovatie': 'Bathroom renovation',
  'Toiletrenovatie': 'Toilet renovation',
  'Keukenrenovaties': 'Kitchen renovations',
  'Traprenovaties': 'Staircase renovations',
  'Zolder/kelder renovaties': 'Attic/basement renovations',

  // ---- Disciplines: dakwerkzaamheden ----
  'Bent u op zoek naar een betrouwbare specialist voor dakwerkzaamheden? Wij verzorgen uiteenlopende werkzaamheden aan zowel platte als hellende daken. Of het nu gaat om een dakrenovatie, dakreparatie, onderhoud, het vervangen van dakbedekking of het opsporen en verhelpen van lekkages, wij staan voor u klaar.': 'Are you looking for a reliable roofing specialist? We carry out a wide range of work on both flat and pitched roofs. Whether it concerns a roof renovation, roof repair, maintenance, replacing roof covering or tracing and fixing leaks, we are ready to help.',
  'Met vakmanschap, kwalitatieve materialen en oog voor detail zorgen wij voor een duurzaam en veilig dak boven uw hoofd. Wij denken graag met u mee en bieden oplossingen die aansluiten bij uw wensen en de staat van uw dak.': 'With craftsmanship, quality materials and an eye for detail, we ensure a durable and safe roof over your head. We are happy to think along with you and offer solutions that match your wishes and the condition of your roof.',
  'Onze werkzaamheden omvatten onder andere:': 'Our work includes, among other things:',
  'Dakreparaties': 'Roof repairs',
  'Dakrenovaties': 'Roof renovations',
  'Dakonderhoud': 'Roof maintenance',
  'Vervangen van dakbedekking': 'Replacing roof covering',
  'Verhelpen van daklekkages': 'Fixing roof leaks',
  'Dakisolatie': 'Roof insulation',
  'Schoorsteen- en loodwerk': 'Chimney and lead work',

  // ---- Disciplines: elektrotechniek ----
  'Veel van het werk van de elektricien verdwijnt uit het zicht, maar we zouden toch echt niet zonder hem kunnen!': 'Much of the electrician’s work disappears from sight, but we really could not do without it!',
  'Onze elektriciens zijn professioneel en divers. Van verlichting tot intercoms kunnen zij alles aanleggen, aanpassen en onderhouden.': 'Our electricians are professional and versatile. From lighting to intercoms, they can install, adapt and maintain everything.',
  'Infrastructuur': 'Infrastructure',
  'Zij zorgen ervoor dat de juiste infrastructuur die nodig is voor elektriciteit, beschikbaar is, zodat uw huis/gebouw veilig binnenkomt en duurzaam gebruikt kan worden. Denk aan de volgende werkzaamheden: -Het vernieuwende van groepenkastcontact/schakelmateriaal en aansluitpunten -Plaatsen/vervangen van brandmelders -Bel/intercom installatie -Telefonie/internetaansluiting -Portiek/trappenhuis/galerij/boxruimte verlichting -Verlichting vluchtroute/nooduitgang/noodverlichting': 'They make sure the right infrastructure for electricity is available, so power enters your home/building safely and can be used sustainably. This includes work such as: - Renewing fuse boxes, switchgear and connection points - Installing/replacing smoke detectors - Doorbell/intercom installation - Telephone/internet connections - Lighting for entrances, stairwells, galleries and storage areas - Escape-route, emergency-exit and emergency lighting',

  // ---- Disciplines: schilderwerk ----
  'Schilderwerk en onderhoud met oog op de toekomst!': 'Painting and maintenance with an eye on the future!',
  'Een frisse uitstraling en goed verzorgd schilderwerk zijn niet alleen mooi om te zien, ze beschermen ook uw woning of pand tegen weersinvloeden en of slijtage. Bij Kortlevers Onderhoud Groep combineren wij vakmanschap met duurzame oplossingen, zodat u jarenlang kunt genieten van strak schilderwerk én minder zorgen heeft over groot onderhoud in de toekomst.': 'A fresh appearance and well-maintained paintwork are not only pleasing to the eye, they also protect your home or property against weather and wear. At Kortlevers Onderhoud Groep we combine craftsmanship with durable solutions, so you can enjoy smart paintwork for years and worry less about major maintenance in the future.',
  'Binnen- en buitenschilderwerk': 'Interior and exterior painting',
  'Of het nu gaat om een complete metamorfose binnenshuis of het beschermen van kozijnen, deuren en gevels -buiten wij werken uitsluitend met hoogwaardige materialen. Dit zorgt voor een perfect eindresultaat dat moet alleen mooi oogt, maar ook lang meegaat.': 'Whether it is a complete indoor makeover or protecting window frames, doors and façades outside, we work exclusively with high-quality materials. This ensures a perfect end result that not only looks great but also lasts.',
  'Duurzaam onderhoud': 'Durable maintenance',
  'Wij geloven dat goed onderhoud begint met aandacht. Daarom kijken we verder dan alleen een lik verf. We signaleren en herstellen beginnende problemen zoals houtrot of scheurtjes in de ondergrond. Zo voorkomt u kostbare reparaties en blijft uw pand in topconditie.': 'We believe good maintenance starts with attention. That is why we look beyond just a coat of paint. We spot and repair early problems such as wood rot or cracks in the surface. This helps you avoid costly repairs and keeps your property in top condition.',
  'Persoonlijk en betrouwbaar': 'Personal and reliable',
  'Geen standaardwerk, maar schilderwerk op maat. Wij luisteren naar uw wensen, geven eerlijk advies over kleuren en materialen en zorgen voor de juiste afwerking. Heldere afspraken, duidelijke communicatie en een nette werkplek zijn voor ons vanzelfsprekend.': 'Not standard work, but painting tailored to you. We listen to your wishes, give honest advice on colours and materials and ensure the right finish. Clear agreements, clear communication and a tidy workplace are a given for us.',
  'Zo straalt u uw woning of bedrijfspand niet alleen vandaag, maar blijft het ook de komende jaren beschermd en representatief!': 'This way your home or business premises not only looks great today but also stays protected and presentable in the years to come!',

  // ---- Duurzaam wonen: energiezuinig glas ----
  'Duurzaam wonen met energiezuinig glas': 'Sustainable living with energy-efficient glazing',
  'Een comfortabele woning begint bij een goede basis. Met de juiste verduurzamingsmaatregelen kunt u niet alleen het wooncomfort verbeteren, maar ook bijdragen aan een energiezuinige en toekomstbestendige woning.': 'A comfortable home starts with a good foundation. With the right sustainability measures, you can not only improve living comfort but also contribute to an energy-efficient and future-proof home.',
  'KOG Onderhoud helpt bewoners en opdrachtgevers graag met duurzame oplossingen op het gebied van glas. Door het vervangen van verouderd glas door modern isolerend glas, zoals HR++ glas, kan warmte beter binnen blijven en wordt het energieverlies aanzienlijk verminderd.': 'KOG Onderhoud is happy to help residents and clients with sustainable glazing solutions. By replacing outdated glass with modern insulating glass, such as HR++ glass, heat is retained better indoors and energy loss is significantly reduced.',
  'De voordelen van duurzaam glas:': 'The benefits of sustainable glazing:',
  'Meer wooncomfort door een betere isolatie': 'More living comfort through better insulation',
  'Minder warmteverlies en een lagere energievraag': 'Less heat loss and lower energy demand',
  'Minder tocht en een aangenamer binnenklimaat': 'Less draught and a more pleasant indoor climate',
  'Betere geluidsisolatie': 'Better sound insulation',
  'Een duurzame investering voor de toekomst': 'A sustainable investment for the future',
  'Wij denken graag met u mee over de mogelijkheden die passen bij uw woning en situatie. Of het nu gaat om vervanging van bestaand glas, onderhoud of een groter verduurzamingsproject: ons team staat voor u klaar met deskundig advies en vakkundige uitvoering.': 'We are happy to think along with you about the options that suit your home and situation. Whether it concerns replacing existing glass, maintenance or a larger sustainability project: our team is ready with expert advice and skilled execution.',

  // ---- Duurzaam wonen: verduurzaming van uw dak ----
  'Verduurzaming van uw dak en gevel met professioneel onderhoud': 'Making your roof and façade more sustainable with professional maintenance',
  'Een duurzaam gebouw begint bij goed onderhoud en slimme verbeteringen. KOG Onderhoud helpt bewoners en opdrachtgevers met het verduurzamen van daken, goten en de buitenzijde van woningen en gebouwen.': 'A sustainable building starts with good maintenance and smart improvements. KOG Onderhoud helps residents and clients make roofs, gutters and the exterior of homes and buildings more sustainable.',
  'Met behulp van onze professionele apparatuur, waaronder een hoogwerker, kunnen wij veilig en efficiënt werkzaamheden uitvoeren op hoogte. Zo zorgen wij ervoor dat uw dak en gevel in optimale conditie blijven en klaar zijn voor de toekomst.': 'Using our professional equipment, including an aerial work platform, we can carry out work safely and efficiently at height. This keeps your roof and façade in optimal condition and ready for the future.',
  'Mogelijke verduurzamingswerkzaamheden aan dak en goot:': 'Possible sustainability works to roof and gutter:',
  'Dakinspectie en onderhoud – het tijdig signaleren en oplossen van problemen voorkomt grotere schade en verlengt de levensduur van uw dak.': 'Roof inspection and maintenance – spotting and solving problems in time prevents greater damage and extends the lifespan of your roof.',
  'Dakisolatie – vermindert warmteverlies en zorgt voor meer comfort in de woning.': 'Roof insulation – reduces heat loss and provides more comfort in the home.',
  'Herstel en onderhoud van dakbedekking – een goed onderhouden dak voorkomt energieverlies en lekkages.': 'Repair and maintenance of roof covering – a well-maintained roof prevents energy loss and leaks.',
  'Gootonderhoud en gootrenovatie – schone en goed functionerende goten zorgen voor een betere waterafvoer en bescherming van de woning.': 'Gutter maintenance and renovation – clean, well-functioning gutters ensure better drainage and protection of the home.',
  'Vervangen of verbeteren van dakranden, aansluitingen en loodwerk – voorkomt vochtproblemen en draagt bij aan een duurzaam gebouw.': 'Replacing or improving roof edges, connections and lead work – prevents moisture problems and contributes to a sustainable building.',
  'Reiniging en onderhoud op hoogte met hoogwerker – veilig onderhoud aan moeilijk bereikbare plekken.': 'Cleaning and maintenance at height with an aerial platform – safe maintenance of hard-to-reach places.',

  // ---- Hoogwerker: bouwinspecties-begeleiding ----
  'Een goede voorbereiding en een duidelijke controle zijn belangrijk bij onderhouds- en renovatieprojecten. KOG Onderhoud ondersteunt bewoners, VvE’s, woningcorporaties en vastgoedbeheerders met professionele bouwinspecties en praktische begeleiding tijdens projecten.': 'Good preparation and clear inspection are important for maintenance and renovation projects. KOG Onderhoud supports residents, HOAs, housing associations and property managers with professional building inspections and practical guidance during projects.',
  'Wij helpen bij het in kaart brengen van de huidige staat van een gebouw, signaleren mogelijke aandachtspunten en denken mee over de juiste aanpak. Zo krijgt u meer inzicht, voorkomt u verrassingen en kunnen werkzaamheden efficiënt worden uitgevoerd.': 'We help map out the current condition of a building, flag possible points of attention and think along about the right approach. This gives you more insight, avoids surprises and allows work to be carried out efficiently.',
  'Onze begeleiding omvat onder andere:': 'Our guidance includes, among other things:',
  'Visuele inspecties van gebouwen en onderdelen': 'Visual inspections of buildings and components',
  'Controle van daken, gevels, goten en bereikbare constructies': 'Checking roofs, façades, gutters and accessible structures',
  'Signaleren van onderhoudspunten en mogelijke risico’s': 'Identifying maintenance points and possible risks',
  'Ondersteuning bij planning en voorbereiding van werkzaamheden': 'Support with planning and preparation of works',
  'Begeleiding tijdens onderhouds- en renovatieprojecten': 'Guidance during maintenance and renovation projects',
  'Afstemming tussen bewoners, opdrachtgevers en uitvoerende partijen': 'Coordination between residents, clients and contractors',
  'Met onze ervaring in onderhoud en verduurzaming zorgen wij voor een praktische aanpak en duidelijke communicatie gedurende het gehele traject.': 'With our experience in maintenance and sustainability, we provide a practical approach and clear communication throughout the entire process.',

  // ---- Hoogwerker: dakinspectie-dakonderhoud ----
  'Een goed onderhouden dak is essentieel voor de veiligheid, het comfort en de levensduur van een gebouw. Kleine beschadigingen of achterstallig onderhoud kunnen op termijn leiden tot lekkages, vochtproblemen en hogere herstelkosten.': 'A well-maintained roof is essential for the safety, comfort and lifespan of a building. Small damage or overdue maintenance can eventually lead to leaks, moisture problems and higher repair costs.',
  'KOG Onderhoud verzorgt professionele dakinspecties en dakonderhoud voor woningen, appartementencomplexen en bedrijfspanden. Met onze kennis en ervaring brengen wij de staat van het dak zorgvuldig in beeld en adviseren wij over passende oplossingen.': 'KOG Onderhoud provides professional roof inspections and roof maintenance for homes, apartment complexes and commercial buildings. With our knowledge and experience, we carefully assess the condition of the roof and advise on suitable solutions.',
  'Visuele dakinspecties': 'Visual roof inspections',
  'Controle van dakbedekking en aansluitingen': 'Checking roof covering and connections',
  'Controle van dakranden, loodwerk en afvoeren': 'Checking roof edges, lead work and drains',
  'Opsporen van mogelijke lekkages en beschadigingen': 'Tracing possible leaks and damage',
  'Preventief dakonderhoud': 'Preventive roof maintenance',
  'Begeleiding bij reparatie- en renovatiewerkzaamheden': 'Guidance with repair and renovation work',
  'Met behulp van onze hoogwerkers kunnen wij ook moeilijk bereikbare delen veilig inspecteren en onderhouden. Zo zorgen wij voor een betrouwbare aanpak en voorkomen we onnodige schade.': 'With our aerial platforms we can also safely inspect and maintain hard-to-reach areas. This ensures a reliable approach and prevents unnecessary damage.',

  // ---- Hoogwerker: gootonderhoud-reiniging-op-hoogte ----
  'Goed onderhouden goten zijn belangrijk voor de bescherming van uw woning of gebouw. Verstopte, vervuilde of beschadigde goten kunnen leiden tot lekkages, vochtproblemen en schade aan gevels en daken.': 'Well-maintained gutters are important for protecting your home or building. Blocked, dirty or damaged gutters can lead to leaks, moisture problems and damage to façades and roofs.',
  'KOG Onderhoud verzorgt professioneel gootonderhoud en reiniging op hoogte met behulp van een hoogwerker. Hierdoor kunnen wij veilig en efficiënt werkzaamheden uitvoeren op plekken die moeilijk bereikbaar zijn, zonder onnodige overlast.': 'KOG Onderhoud provides professional gutter maintenance and cleaning at height using an aerial work platform. This allows us to work safely and efficiently in hard-to-reach places, without unnecessary disruption.',
  'Onze werkzaamheden bestaan onder andere uit:': 'Our work includes, among other things:',
  'Reinigen en vrijmaken van dakgoten': 'Cleaning and clearing gutters',
  'Controleren van goten en hemelwaterafvoer': 'Checking gutters and rainwater drainage',
  'Verwijderen van bladeren, vuil en verstoppingen': 'Removing leaves, dirt and blockages',
  'Controle op lekkages en beschadigingen': 'Checking for leaks and damage',
  'Onderhoud aan moeilijk bereikbare delen van gebouwen': 'Maintenance of hard-to-reach parts of buildings',
  'Door regelmatig onderhoud voorkomt u grotere problemen en verlengt u de levensduur van uw dak- en gevelonderdelen.': 'Regular maintenance prevents bigger problems and extends the lifespan of your roof and façade components.',
  'Wij werken voor bewoners, VvE’s, woningcorporaties en vastgoedbeheerders en denken graag mee over een passende onderhoudsoplossing.': 'We work for residents, HOAs, housing associations and property managers, and are happy to think along about a suitable maintenance solution.',

  // ---- Hoogwerker: index ----
  'Hoog? Geen probleem!': 'High up? No problem!',
  'Kortlevers Onderhoud beschikt over een moderne autohoogwerker waarmee wij snel, veilig en flexibel werkzaamheden op hoogte kunnen uitvoeren. Dankzij deze mobiele oplossing zijn wij inzetbaar op vrijwel iedere locatie en kunnen wij eenvoudig moeilijk bereikbare plekken bereiken.': 'Kortlevers Onderhoud has a modern truck-mounted aerial platform that lets us carry out work at height quickly, safely and flexibly. Thanks to this mobile solution, we can operate at almost any location and easily reach hard-to-access spots.',
  'Met onze autohoogwerker voeren wij onder ander de volgende werkzaamheden uit:': 'With our truck-mounted aerial platform we carry out work such as:',
  'Onderhoud en reparaties op hoogte': 'Maintenance and repairs at height',
  'Gevel- en dak werkzaamheden': 'Façade and roof work',
  'Montage- en installatiewerk': 'Assembly and installation work',
  'Schoonmaakwerkzaamheden': 'Cleaning work',
  'Ook voor inspecties en offerte-opnames kun je op ons rekenen. Met onze hoogwerker gaan we veilig mee op locatie, samen met de bouwkundige, zodat alles direct bekeken en ingemeten kan worden -zelfs op moeilijk bereikbare plekken.': 'You can also count on us for inspections and quotation surveys. With our aerial platform we safely go on site, together with the building surveyor, so everything can be assessed and measured on the spot – even in hard-to-reach places.',

  // ---- Sectoren: particuliere-markt ----
  'Particulier': 'Private individuals',
  'Soms bent u niet helemaal zeker van wat u precies wilt van wat mogelijk is, wij blijven flexibel en denken graag met u mee.': 'Sometimes you are not entirely sure what you want or what is possible; we stay flexible and are happy to think along with you.',
  'Heldere communicatie en altijd bereikbaar, daar kunt u bij ons op aan.': 'Clear communication and always reachable – that is what you can count on with us.',
  'Onze experts komen graag bij u langs voor een passend advies en leveren gratis een offerte.': 'Our experts are happy to visit you for suitable advice and provide a free quotation.',
  'Renovatie': 'Renovation',
  'Restauratie': 'Restoration',
  'Onderhoud': 'Maintenance',
  'Loodgieterswerk': 'Plumbing',
  'Dakwerk': 'Roofing',
  'Electra': 'Electrics',

  // ---- Sectoren: vve-beheer ----
  'Vereniging van Eigenaren en VvE beheerders': 'Homeowners’ Associations and HOA managers',
  'Alle appartementsrechteigenaren zijn verantwoordelijk voor het onderhoud van de VvE. Vaak wordt de VvE bijgestaan ​​door een VvE beheerder. Het binnen- en buitenonderhoud van uw gebouw dient met een goede structuur te worden uitgevoerd, een duidelijk budget en met zo min mogelijk mogelijke onvoorziene kosten voor de bewoners / gebruikers.': 'All apartment owners are responsible for the maintenance of the HOA. The HOA is often assisted by an HOA manager. The interior and exterior maintenance of your building should be carried out with a solid structure, a clear budget and with as few unforeseen costs as possible for residents and users.',
  'Onze aanpak, ons werkproces en zorgvuldige communicatie maken ons tot een vakbekwame partner in het totale onderhoud van uw gebouw en beheer. Wij verzorgen alle aspecten van het onderhoud en zijn vanaf de inspectie en voorbereiding tot de uitvoering en bemiddeling inzetbaar. Door ons diverse team met verschillende expertises zijn wij onder andere inzetbaar voor:': 'Our approach, our work process and careful communication make us a skilled partner in the complete maintenance and management of your building. We handle all aspects of maintenance and are available from inspection and preparation through to execution and coordination. Thanks to our diverse team with various areas of expertise, we can be deployed for, among other things:',
  'Schilderwerk binnen/buiten': 'Interior/exterior painting',
  'Projectadvies / Begeleiding': 'Project advice / Guidance',
  'Betonrenovatie / Fundering renovatie': 'Concrete renovation / Foundation renovation',
  'Gevelinspecties / Verduurzaming isolatie': 'Façade inspections / Insulation upgrades',
  'Coatings van vloeren': 'Floor coatings',
  'Infrastructuur elektriciteit': 'Electrical infrastructure',
  'Herstel / aanleg: leidingwerk / dakgoten.': 'Repair / installation: pipework / gutters.',

  // ---- Sectoren: woningcorporaties ----
  'Kortlevers Onderhoud Groep BV is voor woningcorporaties een deskundige partner in het totaal onderhoud. Van inspectie en voorbereiding tot uitvoering en oplevering.': 'For housing associations, Kortlevers Onderhoud Groep BV is an expert partner in complete maintenance. From inspection and preparation to execution and delivery.',
  'Woningcorporaties kunnen bij ons terecht met al hun vastgoedvraagstukken, wij bieden de zekerheid dat het onderhoud van gebouwen / woningen op de meest effectieve manier wordt uitgevoerd. Wij werken zowel projectmatig als planmatig.': 'Housing associations can come to us with all their property questions; we offer the certainty that the maintenance of buildings and homes is carried out in the most effective way. We work both project-based and planned.',
  'Onze ervaring met het uitvoeren van groot onderhoud voor wooncomplexen bied een goed resultaat in omgang met bewoners. Onze overzichtelijke procedures en open communicatie zorgen voor zo min mogelijk belast voor de bewoners, waarbij wij de belangen van de corporatie en de bewoners met zorg behandelen.': 'Our experience in carrying out major maintenance for residential complexes delivers good results in dealing with residents. Our clear procedures and open communication keep disruption to residents to a minimum, while we handle the interests of both the association and the residents with care.',
  'Heldere communicatie en altijd bereikbaar, daar kunt u bij ons op aan!': 'Clear communication and always reachable – that is what you can count on with us!',

  // ---- Sectoren: zakelijke-markt ----
  'Op de zakelijke markt is het van belang dat de gebruikers van het vastgoed op een gezonde en prettige plek kunnen werken. Bedrijfs- en kantoorpanden moeten uitstraling hebben. Dit kan alleen als het onderhoud in een optimaal conditieverkeer.': 'In the business market it is important that the users of a property can work in a healthy and pleasant environment. Commercial and office premises need to look their best. This is only possible when maintenance keeps them in optimal condition.',

  // ---- Service dagelijks onderhoud: dagelijks-onderhoud ----
  '"Goed onderhoud is onzichtbaar: het zorgt dat alles werkt zonder dat iemand het merkt!"': '"Good maintenance is invisible: it keeps everything working without anyone noticing!"',
  'Kortlevers Onderhoud Groep zal binnen 2 uur telefonisch contact opnemen met de bewoner om een ​​​​​​​​afspraak te maken voor de uit te voeren werkzaamheden. Wij geven direct voorrang aan spoedsituaties. Wij zijn flexibel, begripvol en betrouwbaar voor de bewoners. Wij bevestigen indien gewenst per e-mail een afspraak.': 'Kortlevers Onderhoud Groep will contact the resident by phone within 2 hours to arrange an appointment for the work to be carried out. We give immediate priority to emergencies. We are flexible, understanding and reliable towards residents. If desired, we confirm appointments by email.',
  'Werkzaamheid': 'The work',
  'Wij dragen zorg voor de beste en meest effectieve oplossing indien dit een aanbieding is, proberen wij waar mogelijk en altijd nodig een noodvoorziening te plaatsen. Wij zullen de opdrachtgever door het midden van een terugkoppeling en van foto\'s op de hoogte van de werkzaamheden / situatie en van gereed melden.': 'We take care of the best and most effective solution. Where necessary, we put a temporary provision in place. We keep the client informed of the work and situation through feedback and photos, and report when the job is completed.',
  '24/7-service': '24/7 service',
  'Voor spoedreparaties en noodgevallen zijn wij ook buiten werktijden, in het weekend en tijdens feestdagen 24 uur per dag en 7 dagen per week bereikbaar.': 'For emergency repairs and urgent situations we are reachable outside office hours too – in the weekend and on public holidays, 24 hours a day, 7 days a week.',

  // ---- Service dagelijks onderhoud: planmatig-onderhoud ----
  'Onderhouden is goedkoper dan herstellen!': 'Maintaining is cheaper than repairing!',
  'Planmatig onderhouden': 'Planned maintenance',
  'Onderhouden voorkomt kosten en verlengt levensduur. Planmatig vastgoedonderhoud voorkomt hoge herstelkosten en verlengt de levensduur van uw gebouwen. Door tijdig te investeren in inspecties, onderhoud en kleine reparaties, blijft uw vastgoed veilig, comfortabel en waardevast. Het is een slimme aanpak die onverwachte problemen voorkomen en zorgt dat u panden altijd in de optimale staat verkeren.': 'Maintenance prevents costs and extends lifespan. Planned property maintenance prevents high repair costs and extends the lifespan of your buildings. By investing in inspections, maintenance and small repairs in good time, your property stays safe, comfortable and holds its value. It is a smart approach that prevents unexpected problems and keeps your buildings in optimal condition.',

  // ---- Service dagelijks onderhoud: werkzaamheden-bij-u-in-de-buurt ----
  'Zijn wij werkzaam aan een project op uw locatie. Tijdens onze werkzaamheden kunt u ons tijdens kantooruren bereiken via 020 26 000 98 voor vragen, opmerkingen of aanvullende informatie.': 'Are we working on a project at your location? During our work you can reach us during office hours on 020 26 000 98 for questions, comments or additional information.',
  'Buiten kantooruren zijn wij voor dringende zaken bereikbaar per email: info@kogonderhoud.nl': 'Outside office hours you can reach us for urgent matters by email: info@kogonderhoud.nl',
  'Wij doen er alles aan om de werkzaamheden zo soepel mogelijk te laten verlopen en bedanken u voor uw begrip en medewerking.': 'We do everything we can to make the work run as smoothly as possible and thank you for your understanding and cooperation.',

  // ---- Voor bewoners: index ----
  'KOG Onderhoud – betrokken, bereikbaar en altijd klaar voor u!': 'KOG Onderhoud – committed, reachable and always ready for you!',
  'Zijn wij momenteel bezig met werkzaamheden aan een project bij u in de buurt? Of heeft u van ons een terugbelverzoek ontvangen?': 'Are we currently carrying out work on a project near you? Or have you received a call-back request from us?',
  'Ons Klantcontact & Dagelijks Onderhoud Service Team staat iedere doordeweekse dag voor u klaar om u snel en prettig te helpen.': 'Our Customer Contact & Daily Maintenance Service Team is ready for you every weekday to help you quickly and pleasantly.',
  'Heeft u een vraag, wilt u iets doorgeven of heeft u behoefte aan informatie? Neem gerust contact met ons op — wij denken graag met u mee!': 'Do you have a question, something to report or need information? Feel free to contact us — we are happy to help!',
  '📞 Bel ons: 020 26 000 98✉️ Mail ons: info@kogonderhoud.nl': '📞 Call us: 020 26 000 98 ✉️ Email us: info@kogonderhoud.nl',

  // ---- Voor bewoners: project-bij-u-in-de-buurt ----
  'Zijn wij momenteel bezig met een groter project bij u in de buurt? Heeft u vragen, opmerkingen of wilt u meer informatie over onze planning of de werkzaamheden? Ons team staat graag voor u klaar.': 'Are we currently working on a larger project near you? Do you have questions or comments, or would you like more information about our schedule or the work? Our team is happy to help.',
  'Wij vinden het belangrijk om goed bereikbaar te zijn en u zo snel mogelijk verder te helpen. Neem gerust contact met ons op via onderstaande gegevens.': 'It is important to us to be easily reachable and to help you as quickly as possible. Feel free to contact us using the details below.',
  'KOG Onderhoud – uw aanspreekpunt tijdens de werkzaamheden.': 'KOG Onderhoud – your point of contact during the work.',

  // ---- Voor bewoners: terug-bel-verzoek ----
  'Welkom bij KOG Onderhoud!': 'Welcome to KOG Onderhoud!',
  'Heeft u van ons een terugbelverzoek ontvangen? Dan zijn wij waarschijnlijk al bij u op locatie geweest.': 'Have you received a call-back request from us? Then we have probably already been on site at your location.',
  'Wij vragen u vriendelijk om telefonisch of per e-mail contact met ons op te nemen.': 'We kindly ask you to contact us by phone or email.',
  'Ons Dagelijks Onderhoud Service Team staat voor u klaar en helpt u graag verder.': 'Our Daily Maintenance Service Team is ready to help you.',
  'Wij horen graag van u en staan klaar om u te helpen!KOG Onderhoud – betrokken, bereikbaar en altijd dichtbij.': 'We look forward to hearing from you and are ready to help! KOG Onderhoud – committed, reachable and always close by.',
};

// Build normalized lookup
const stripInvisible = s => Array.from(s).filter(ch => {
  const c = ch.codePointAt(0);
  return !(c === 0x200B || c === 0x200C || c === 0x200D || c === 0xFEFF ||
           (c >= 0x200E && c <= 0x200F) || (c >= 0x202A && c <= 0x202E) ||
           (c >= 0x2060 && c <= 0x2064) || (c >= 0x2066 && c <= 0x2069));
}).join('');
const norm = s => stripInvisible(s).replace(/\s+/g, ' ').trim().toLowerCase();
const LOOK = {};
for (const [k, v] of Object.entries(MAP)) LOOK[norm(k)] = v;

const BLOCK = 'h1,h2,h3,h4,h5,h6,p,li,blockquote,a,button,span.ctaL,td,th,figcaption';
const isBlock = el => el.tagName && /^(h[1-6]|p|li|blockquote|a|button|td|th|figcaption)$/i.test(el.tagName);

function walk(d){let o=[];for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory()){if(/^(_ext|Assets|bundles|images|media|Css)$/.test(e.name))continue;o=o.concat(walk(p));}else if(e.name.endsWith('.html'))o.push(p);}return o;}

let filesChanged = 0, replacements = 0;
const unmatchedSamples = new Set();

for (const f of walk(ROOT)) {
  const html = fs.readFileSync(f, 'utf8');
  const $ = cheerio.load(html, { decodeEntities: false });
  let changed = false;

  $(BLOCK).each((_, el) => {
    const $el = $(el);
    // skip if it has a block-level descendant (avoid flattening parents/menus)
    if ($el.find(BLOCK).filter((_, d) => isBlock(d)).length) return;
    const key = norm($el.text());
    if (!key) return;
    if (LOOK[key] !== undefined) {
      if ($el.text() !== LOOK[key]) { $el.text(LOOK[key]); changed = true; replacements++; }
    }
  });

  // <title>: translate segments split by |
  const title = $('title').first();
  if (title.length) {
    const parts = title.text().split('|').map(s => {
      const t = s.trim(); const hit = LOOK[norm(t)];
      return hit !== undefined ? hit : t.replace(/Kortlevers Onderhoud Groep B\.V\./g, 'Kortlevers Onderhoud Groep B.V.');
    });
    const nt = parts.join(' | ');
    if (nt !== title.text()) { title.text(nt); changed = true; }
  }

  // html lang
  if ($('html').attr('lang') === 'nl') { $('html').attr('lang', 'en'); changed = true; }

  if (changed) { fs.writeFileSync(f, $.html(), 'utf8'); filesChanged++; }
}

console.log(`Files changed: ${filesChanged}, replacements: ${replacements}`);
