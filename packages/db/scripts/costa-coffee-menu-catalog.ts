export type CostaMenuCatalogEntry = {
  name: string;
  price: number;
  description?: string;
  soldOut?: boolean;
};

export type CostaMenuCatalogCategory = {
  name: string;
  presetKey?: string | null;
  categoryDescription?: string;
  items: CostaMenuCatalogEntry[];
};

const ALLERGEN_NOTE =
  "For full allergen and nutrition information, please visit https://www.costa.co.uk/menu.";

export const COSTA_COFFEE_MENU_CATALOG: CostaMenuCatalogCategory[] = [
  {
    name: "Deals",
    presetKey: "meal-deals",
    categoryDescription: "Meal deals from 11am. Customisations and milk alternatives may incur extra charges.",
    items: [
      {
        name: "Lunch Meal For 1",
        price: 10,
        description:
          "From 11am. Choose 1 item from the required sections below. Subject to availability. Customisations, additions & milk alternatives subject to additional charge(s) shown. Items not listed are excluded. Full T&Cs at Costa.co.uk.",
      },
      {
        name: "Lunch + Crisps Meal for 1",
        price: 11,
        description:
          "From 11am. Choose 1 item from the required sections below. Subject to availability. Customisations, additions & milk alternatives subject to additional charge(s) shown. Items not listed are excluded. Full T&Cs at Costa.co.uk.",
      },
      {
        name: "Afternoon Coffee & Cake Deal",
        price: 7.49,
        description:
          "From 11am. Choose 1 item from the required sections below. Subject to availability. Customisations, additions & milk alternatives subject to additional charge(s) shown. Items not listed are excluded. Full T&Cs at Costa.co.uk.",
      },
    ],
  },
  {
    name: "What's New",
    items: [
      {
        name: "Apple & Kiwi Refresher",
        price: 4.95,
        description:
          "Bursting with colour and flavour of refreshing apple and the exotic flavour of kiwi, shaken with ice, water and topped with a delicious lime piece. From 83 kcal. " + ALLERGEN_NOTE,
      },
      {
        name: "Cherry Vanilla Iced Whipped Latte",
        price: 5,
        description:
          'A layered iced latte, a fruity Cherry Vanilla Sauce, a milk or milk alternative layer of your choice and topped with a smooth whipped milky coffee. ATTENTION: This drink cannot be made dairy free, even when made with a dairy alternative, due to other ingredients containing milk. ' +
          ALLERGEN_NOTE,
      },
      {
        name: "Chicken Fajita Wrap",
        price: 5.95,
        description: "Chicken, mozzarella, red pepper and a spicy tomato sauce. 407 kcal. " + ALLERGEN_NOTE,
      },
      {
        name: "Hazelnut Crème Frappe",
        price: 5.49,
        description:
          'A delicious blended drink with our Hazelnut Crème Flavour Sauce, and topped with Light Whip and a drizzle of more Hazel Crème Sauce. ATTENTION: This drink cannot be made dairy free, even when made with a dairy alternative, due to other ingredients containing milk. ' +
          ALLERGEN_NOTE,
      },
      {
        name: "Hazelnut Creme Iced Whipped Latte",
        price: 5,
        description:
          'A layered iced latte, with our Hazelnut Crème Flavour Sauce, a milk or milk alternative layer of your choice and topped with a smooth whipped milky coffee. ATTENTION: This drink cannot be made dairy free. ' +
          ALLERGEN_NOTE,
      },
      {
        name: "Iced Oat Velvetino",
        price: 5,
        description:
          "A smooth, velvety iced coffee made with our freshly extracted Mocha Italia blend, subtly sweet agave flavour syrup and paired with plant-based alternative oat drink. Customisable with your choice of milk or plant-based alternative. " +
          ALLERGEN_NOTE,
      },
      {
        name: "Jasmine Hibiscus Iced Tea",
        price: 4.2,
        description:
          "A refreshing Jasmine flavoured, Berry & Hibiscus iced tea, topped with a delicious lemon slice. 103 kcal. " + ALLERGEN_NOTE,
      },
      {
        name: "Morello Cherry & Vanilla Cake",
        price: 4.49,
        description:
          "Vanilla sponge filled with Morello cherry jam and vanilla frosting, finished with Morello cherry frosting, Morello cherry jam and freeze dried cherries. 428 kcal.",
      },
      {
        name: "Sweet Ube Iced Matcha",
        price: 6.15,
        description:
          "A dreamy layered ube flavour matcha, with a creamy-sweet, vanilla flavour and a slight hint of nuttiness, featuring a vibrant purple hue. " + ALLERGEN_NOTE,
      },
      {
        name: "Sweet Ube Iced Whipped Latte",
        price: 5,
        description:
          'An Ube flavour layered iced latte with a dreamy purple hue. ATTENTION: This drink cannot be made dairy free. ' + ALLERGEN_NOTE,
      },
      {
        name: "Chicken Gyros Style Flatbread",
        price: 5.95,
        soldOut: true,
        description:
          "Gyros style chicken breast with garlic & mint yogurt sauce, roasted onion & pepper & spinach in an oregano flatbread. 339 kcal. " + ALLERGEN_NOTE,
      },
    ],
  },
  {
    name: "Pastries, Baps & Breakfast",
    items: [
      {
        name: "Tomato & Mature Cheddar Croissant",
        price: 4.7,
        description:
          "Sliced tomato and mature Cheddar cheese with tomato béchamel sauce and Sunblush® marinated slow roasted tomatoes in an all butter croissant. 396 kcal. " + ALLERGEN_NOTE,
      },
      {
        name: "Cinnamon Bun",
        price: 3.6,
        description:
          "A bun swirled with cinnamon filling, decorated with cream cheese icing and dusted with cinnamon powder. 447 kcal. " + ALLERGEN_NOTE,
      },
      { name: "Croissant (V)", price: 3, description: "All butter croissant. 246 kcal. " + ALLERGEN_NOTE },
      {
        name: "Almond Croissant",
        price: 3.3,
        description:
          "Croissants with an almond filling, topped with almond flakes and icing sugar. 318 kcal. " + ALLERGEN_NOTE,
      },
      {
        name: "Chocolate Twist (V)",
        price: 3.3,
        description: "A chocolate pastry with a twist. 309 kcal. " + ALLERGEN_NOTE,
      },
      {
        name: "Pain Aux Raisins",
        price: 3.3,
        description: "All butter pastry swirled with raisins. 352 kcal. " + ALLERGEN_NOTE,
      },
      {
        name: "Greek Style Yogurt with Mixed Berry Compote",
        price: 3.6,
        description:
          "Greek Style Yogurt with Mixed Berry Compote and Crunchy Granola. 249 kcal. " + ALLERGEN_NOTE,
      },
      {
        name: "Pork Sausage Bap",
        price: 4.8,
        description: "Succulent pork sausage in a buttered white roll. 515 kcal. " + ALLERGEN_NOTE,
      },
      {
        name: "Smoked Bacon Bap",
        price: 4.8,
        description: "Beechwood smoked bacon in a buttered white roll. 343 kcal. " + ALLERGEN_NOTE,
      },
      {
        name: "Egg & Mushroom Bap",
        price: 4.8,
        description:
          "Free range scrambled egg, roasted mushrooms, spinach and mature Cheddar cheese with hollandaise style sauce in a white roll. 339 kcal. " +
          ALLERGEN_NOTE,
      },
    ],
  },
  {
    name: "Muffins, Cakes and Bakes",
    items: [
      {
        name: "Chocolate & Pistachio Cookie Sandwich",
        price: 3.9,
        description:
          "A rich dark chocolate cookie sandwich filled with creamy pistachio frosting, drizzled with icing and hand finished with pistachio nuts. 337 kcal. " +
          ALLERGEN_NOTE,
      },
      {
        name: "Morello Cherry & Vanilla Cake",
        price: 4.49,
        description:
          "Vanilla sponge filled with Morello cherry jam and vanilla frosting, finished with Morello cherry frosting, Morello cherry jam and freeze dried cherries. 428 kcal.",
      },
      {
        name: "Caramelised Biscuit Rocky Road",
        price: 3.35,
        description:
          "Dark chocolate biscuit base with marshmallows and cherries, topped with Speculoos biscuit spread, Speculoos biscuit crumb, marshmallows, and dark chocolate ganache. 278 kcal. " +
          ALLERGEN_NOTE,
      },
      {
        name: "Double Chocolate Cookie",
        price: 3.2,
        description: "Vegan Cookie with Plain Chocolate Pieces. 359 kcal. " + ALLERGEN_NOTE,
      },
      {
        name: "Carrot & Walnut Cake",
        price: 4.49,
        description:
          "Carrot and walnut cake topped and filled with layers of soft cream cheese butter icing and decorated with walnut nibs. 497 kcal. " + ALLERGEN_NOTE,
      },
      {
        name: "Blueberry Muffin",
        price: 3.65,
        description:
          "A blueberry muffin, filled with a blueberry sauce and topped with blueberries. 403 kcal. " + ALLERGEN_NOTE,
      },
      {
        name: "Lemon Muffin (V)",
        price: 3.65,
        description: "Lemon muffin with a gooey lemon curd centre. 399 kcal. " + ALLERGEN_NOTE,
      },
      {
        name: "Millionaire's Shortbread (V)",
        price: 3.35,
        description:
          "Crisp Scottish shortbread base, topped with a buttery rich caramel and layer of milk chocolate. 396 kcal. " + ALLERGEN_NOTE,
      },
      {
        name: "Chocolate Tiffin (V)",
        price: 3.35,
        description:
          "Milk chocolate binding dried fruit and digestive biscuit pieces. 403 kcal. " + ALLERGEN_NOTE,
      },
      {
        name: "Salted Caramel Brownie",
        price: 3.35,
        description: "Dark chocolate brownie with salted caramel. 352 kcal. " + ALLERGEN_NOTE,
      },
      {
        name: "Raspberry & Almond Bake",
        price: 3.35,
        description:
          "Shortbread base with a raspberry jam layer, topped with almond frangipane, raspberry drizzle and flaked almonds. 346 kcal. " + ALLERGEN_NOTE,
      },
      {
        name: "Bakewell Tart (V)",
        price: 3.6,
        description:
          "A butter rich pastry encasing a layer of almond frangipane, Morello cherry jam and sweet, glossy fondant. 368 kcal. " + ALLERGEN_NOTE,
      },
      {
        name: "Milk Chocolate Cookie",
        price: 3.2,
        soldOut: true,
        description: "Baked Cookie with Milk Chocolate Pieces. 364 kcal. " + ALLERGEN_NOTE,
      },
    ],
  },
  {
    name: "Main Meals",
    items: [
      {
        name: "Chicken Fajita Wrap",
        price: 5.95,
        description: "Chicken, mozzarella, red pepper and a spicy tomato sauce. 407 kcal. " + ALLERGEN_NOTE,
      },
      {
        name: "Brie & Bacon Chilli Jam Panini",
        price: 6.2,
        description:
          "Brie, beechwood smoked streaky bacon and smoky chilli relish in a seed topped panini with sourdough. 589 kcal. " + ALLERGEN_NOTE,
      },
      {
        name: "Chicken Salad Sandwich",
        price: 4.25,
        description:
          "Roast chicken breast with lemon and black pepper mayonnaise, sliced tomato, sliced cucumber and lettuce on malted bread. 386 kcal. " +
          ALLERGEN_NOTE,
      },
      {
        name: "All Day Breakfast Toastie",
        price: 6.2,
        description:
          "Pork sausage and smoked streaky bacon with tomato ketchup, free range scrambled egg, hollandaise style sauce and mature Cheddar cheese on cheese topped white bread. 538 kcal. " +
          ALLERGEN_NOTE,
      },
      {
        name: "Chicken & Bacon Toastie",
        price: 6,
        description:
          "British roast chicken & sweetcure bacon with mature Cheddar & mozzarella cheese on cheese topped white bread. 460 kcal. " + ALLERGEN_NOTE,
      },
      { name: "Cheese Bites", price: 4.15, description: "Cheese bites with tomato chutney. 247 kcal. " + ALLERGEN_NOTE },
      {
        name: "Nacho Chilli Cheese & Chicken Toastie",
        price: 6.2,
        description:
          "British roast chicken & chilli Cheese with nacho cheese sauce & jalapeños on tortilla chips & cheese topped bloomer bread. 586 kcal. " +
          ALLERGEN_NOTE,
      },
      {
        name: "Vegan Ham & Cheeze Toastie",
        price: 4.6,
        description:
          "Plant based smoky ham, cheeze and plant based mayonnaise on barmarked white bread. 333 kcal. " + ALLERGEN_NOTE,
      },
      {
        name: "Hog Roast Toastie",
        price: 6.2,
        description:
          "Hickory pulled pork, spiced apple glaze, caramelised onion chutney, sage & onion stuffing & oak smoked Cheddar in garlic & herb topped bloomer. 546 kcal. " +
          ALLERGEN_NOTE,
      },
      {
        name: "Heinz Beanz & Cheese Toastie",
        price: 4.6,
        description: "Heinz baked beanz and mature Cheddar cheese in bar marked white bread. 321 kcal. " + ALLERGEN_NOTE,
      },
      {
        name: "All Day Breakfast Wrap",
        price: 5.95,
        description:
          "British Beechwood smoked bacon, pork sausage & free range egg with tomato ketchup in a barmarked tortilla wrap. 604 kcal. " + ALLERGEN_NOTE,
      },
      {
        name: "Ham & Cheese Toastie",
        price: 4.6,
        description: "Ham, cheddar cheese and bechamel on toasted bread. 356 kcal. " + ALLERGEN_NOTE,
      },
      {
        name: "Wiltshire Ham & Mature Cheddar Toastie",
        price: 5.8,
        description:
          "Wiltshire ham and mature cheddar with a hint of mustard on white bread, topped with melted cheese. 393 kcal. " + ALLERGEN_NOTE,
      },
      {
        name: "Mozzarella & Tomato Panini (V)",
        price: 5.8,
        description: "Slow roasted tomatoes and basil pesto on a toasted sourdough ciabatta. 493 kcal. " + ALLERGEN_NOTE,
      },
      {
        name: "Tuna Melt Panini",
        price: 5.9,
        description: "Tuna, Cheddar cheese and mozzarella in a stone baked sourdough panini. 462 kcal. " + ALLERGEN_NOTE,
      },
      {
        name: "Mac & Cheese",
        price: 6.45,
        description:
          "Cooked pasta with cheese sauce, mature Cheddar cheese and parsley crumb. 567 kcal. " + ALLERGEN_NOTE,
      },
      {
        name: "Pork & Apple Sausage Roll",
        price: 4.1,
        description:
          "Seasoned pork sausagemeat with pulled pork and Bramley apples in all butter puff pastry topped with pork crackling. 384 kcal. " +
          ALLERGEN_NOTE,
      },
      {
        name: "BLT Sandwich",
        price: 4.49,
        description:
          "Beechwood smoked bacon with tomato, lettuce & mayo on malted bread. 419 kcal. " + ALLERGEN_NOTE,
      },
      {
        name: "Free Range Egg Mayo Sandwich",
        price: 3.49,
        description:
          "Free range egg in a creamy seasoned mayonnaise, on malted bread. 400 kcal. " + ALLERGEN_NOTE,
      },
      {
        name: "Prawn Mayo Sandwich",
        price: 4.49,
        description: "Prawns with mayonnaise on oatmeal bread. 280 kcal. " + ALLERGEN_NOTE,
      },
      {
        name: "Mature Cheddar & Roasted Tomato Toastie",
        price: 5.7,
        description: "The classic combination of cheese and tomato on toasted bread. 430 kcal. " + ALLERGEN_NOTE,
      },
      {
        name: "Chicken Gyros Style Flatbread",
        price: 5.95,
        soldOut: true,
        description:
          "Gyros style chicken breast with garlic & mint yogurt sauce, roasted onion & pepper & spinach in an oregano flatbread. 339 kcal. " +
          ALLERGEN_NOTE,
      },
      {
        name: "Wiltshire Ham & Mature Cheddar Croissant",
        price: 4.7,
        soldOut: true,
        description:
          "Wiltshire cured ham and mature Cheddar cheese in an all-butter croissant. 370 kcal. " + ALLERGEN_NOTE,
      },
    ],
  },
  {
    name: "Biscuits and Snacks",
    items: [
      { name: "Dried Mango", price: 2, description: "Sweetened Dried Mango. " + ALLERGEN_NOTE },
      { name: "Fruit & Nut Mix", price: 2, description: "Fruit & Nut Mix. " + ALLERGEN_NOTE },
      { name: "Oaty Flapjack", price: 3.1, description: "Gluten and milk free oat flapjack. " + ALLERGEN_NOTE },
      {
        name: "Bounce Peanut Protein Ball",
        price: 2.4,
        description:
          "Bounce Peanut Protein Ball – 8.3g protein, heart-healthy fats, vitamins & minerals, plus a nut butter centre. " +
          ALLERGEN_NOTE,
      },
      {
        name: "Tyrrells Lightly Sea Salted",
        price: 2.15,
        description: "Gloriously unadorned but for a casual dusting of sea salt. " + ALLERGEN_NOTE,
      },
      {
        name: "Tyrrells Sea Salt & Cider Vinegar",
        price: 2.15,
        description: "The burly kick of cider vinegar; the subtle yet satisfying sting of sea salt. " + ALLERGEN_NOTE,
      },
      {
        name: "Tyrrells Mature Cheddar & Chive",
        price: 2.15,
        description: "The tangy hit of mature cheddar with the oniony twang of chive. " + ALLERGEN_NOTE,
      },
      { name: "Watermelon", price: 3, description: "Juicy watermelon chunks. 66 kcal. " + ALLERGEN_NOTE },
      {
        name: "Belgian Chocolate Brownie (Gluten Free)",
        price: 3.1,
        description: "Brownie with milk and dark chocolate. 302 kcal. " + ALLERGEN_NOTE,
      },
      {
        name: "Mini All Butter Shortbreads",
        price: 3.8,
        description: "Eight crumbly all butter shortbread bites. Perfect for sharing. 52 kcal. " + ALLERGEN_NOTE,
      },
      {
        name: "Caramel Waffles",
        price: 2.45,
        description:
          "Our waffles are made to an authentic family recipe from the Netherlands and filled with a buttery syrup filling, enriched with natural vanilla. 363 kcal. " +
          ALLERGEN_NOTE,
      },
      {
        name: "Balocco Wafers - Cocoa (V)",
        price: 2.45,
        description:
          "Crisp wafer biscuits layered with a sweet and creamy cocoa and hazelnut filling. Made in Italy. " + ALLERGEN_NOTE,
      },
      {
        name: "Balocco Wafers - Milk Vanilla (V)",
        price: 2.45,
        description: "Crisp wafer biscuits layered with a sweet vanilla crème. Made in Italy. " + ALLERGEN_NOTE,
      },
      {
        name: "Stem Ginger Biscuits",
        price: 2.6,
        description:
          "Coming all the way from Scotland, our stem ginger biscuits are deliciously sweet and spicy. 234 kcal. " + ALLERGEN_NOTE,
      },
      {
        name: "Fruit & Oat Biscuits",
        price: 2.6,
        description:
          "This classic Scottish combination of raisins and rolled oats is always a winner. 228 kcal. " + ALLERGEN_NOTE,
      },
      {
        name: "Pom-Bear Original Crisps",
        price: 1.6,
        description:
          "Deliciously light and crispy bear-shaped snacks that simply melt in your mouth. " + ALLERGEN_NOTE,
      },
      {
        name: "Bubble Frappe Gingerbread Biscuit",
        price: 3.35,
        soldOut: true,
        description: "Gingerbread biscuit decorated with coloured fondant icing. 189 kcal. " + ALLERGEN_NOTE,
      },
    ],
  },
  {
    name: "Iced Drinks",
    presetKey: "coffee",
    items: [
      {
        name: "Hazelnut Creme Iced Whipped Latte",
        price: 5,
        description:
          'Layered iced latte with Hazelnut Crème Flavour Sauce. ATTENTION: Cannot be made dairy free. ' + ALLERGEN_NOTE,
      },
      {
        name: "Cherry Vanilla Iced Whipped Latte",
        price: 5,
        description: "Layered iced latte with Cherry Vanilla Sauce. " + ALLERGEN_NOTE,
      },
      {
        name: "Iced Oat Velvetino",
        price: 5,
        description: "Velvety iced coffee with Mocha Italia blend and oat drink. " + ALLERGEN_NOTE,
      },
      {
        name: "Strawberry, Watermelon & Mint Refresher",
        price: 4.95,
        description: "Watermelon, strawberry and mint shaken with ice. From 132 kcal. " + ALLERGEN_NOTE,
      },
      { name: "Still Lemonade", price: 4.35, description: "A refreshing still lemonade over ice. 54 kcal." },
      {
        name: "Spanish Iced Latte",
        price: 5.4,
        description: "Iced latte with Condensed Milk Flavoured Sauce. Cannot be made dairy free. " + ALLERGEN_NOTE,
      },
      {
        name: "Dragon Fruit & Guava Refresher",
        price: 4.95,
        description: "Dragon fruit and guava shaken with ice. From 131 kcal.",
      },
      { name: "Pink Lemonade", price: 4.35, description: "Still lemonade over ice with sweet strawberry sauce. 114 kcal." },
      {
        name: "Sweet Ube Iced Whipped Latte",
        price: 5,
        description: "Ube flavour layered iced latte with purple hue. " + ALLERGEN_NOTE,
      },
      { name: "Sweet Ube Frappe", price: 5.49, description: "Sweet Ube flavour Frappe with light whip. " + ALLERGEN_NOTE },
      {
        name: "Caramel Iced Whipped Latte",
        price: 5,
        description: "Layered iced latte with salted caramel sauce. " + ALLERGEN_NOTE,
      },
      {
        name: "White Chocolate Iced Whipped Latte",
        price: 5,
        description: "Layered iced latte with white chocolate sauce. " + ALLERGEN_NOTE,
      },
      {
        name: "Iced Flat White",
        price: 4.49,
        description: "Cortissimo shot blended with milk, topped with whipped milk foam. " + ALLERGEN_NOTE,
      },
      {
        name: "Iced Cappuccino",
        price: 4.6,
        description: "Espresso topped with whipped milk foam. " + ALLERGEN_NOTE,
      },
      {
        name: "Iced Americano (white)",
        price: 4.05,
        description: "Espresso over ice with milk or dairy alternative. " + ALLERGEN_NOTE,
      },
      { name: "Iced Black Americano", price: 4.05, description: "Classic black coffee over ice. From 18 kcal." },
      { name: "Peach Ice Tea", price: 4.2, description: "Sweet yet refreshing peach iced tea. 107 kcal. " + ALLERGEN_NOTE },
      { name: "Iced Latte", price: 4.6, description: "Chilled milk over ice, topped with espresso. " + ALLERGEN_NOTE },
      {
        name: "Coffee Frappe",
        price: 5.49,
        description: "Creamy, milky ice-cold coffee frappé with light whip. " + ALLERGEN_NOTE,
      },
      {
        name: "Strawberry Drizzle Frappe",
        price: 5.49,
        description: "Blended drink with strawberry sauce and light whip. " + ALLERGEN_NOTE,
      },
      {
        name: "Chocolate Fudge Frappé",
        price: 5.49,
        description: "Rich chocolate-y creamy blended drink with light whip. " + ALLERGEN_NOTE,
      },
      {
        name: "Chocolate Fudge Frappé with Coffee",
        price: 5.49,
        description: "Chocolate fudge frappé with added coffee. " + ALLERGEN_NOTE,
      },
      {
        name: "Salted Caramel Frappé",
        price: 5.49,
        description: "Salted caramel frappé with light whip. " + ALLERGEN_NOTE,
      },
      {
        name: "Salted Caramel Frappé with Coffee",
        price: 5.49,
        description: "Salted caramel & coffee frappé. " + ALLERGEN_NOTE,
      },
      {
        name: "Tropical Mango Bubble Frappe",
        price: 5.65,
        description:
          "Mango flavoured sauce with bursting mango bubbles and light whip. WARNING CHOKING HAZARD: Not suitable for children under 3 years. " +
          ALLERGEN_NOTE,
      },
      {
        name: "Mango & Passion Fruit Cooler",
        price: 5.2,
        description: "Mango and passionfruit puree blended with ice. 165 kcal. " + ALLERGEN_NOTE,
      },
      {
        name: "Red Summer Berries",
        price: 5.2,
        description: "Summer berries puree blended with ice. 218 kcal. " + ALLERGEN_NOTE,
      },
    ],
  },
  {
    name: "Matcha Lattes",
    presetKey: "coffee",
    items: [
      {
        name: "Sweet Ube Iced Matcha",
        price: 6.15,
        description: "Dreamy layered ube flavour matcha with vibrant purple hue. " + ALLERGEN_NOTE,
      },
      {
        name: "Matcha Latte",
        price: 5.05,
        description: "Pure fine green matcha tea with steamed milk. " + ALLERGEN_NOTE,
      },
      {
        name: "Iced Matcha Latte",
        price: 5.05,
        description: "Pure matcha green tea with chilled milk over ice. " + ALLERGEN_NOTE,
      },
      {
        name: "Strawberry Coconut Matcha Iced Latte",
        price: 6.15,
        description: "Matcha green tea with strawberry sauce and creamy coconut. " + ALLERGEN_NOTE,
      },
      {
        name: "Cherry Vanilla Iced Matcha",
        price: 6.15,
        soldOut: true,
        description: "Matcha with Cherry Vanilla Sauce and chilled milk. " + ALLERGEN_NOTE,
      },
    ],
  },
  {
    name: "Coffee",
    presetKey: "coffee",
    items: [
      {
        name: "Spanish Latte",
        price: 5.4,
        description: "Latte with Condensed Milk Flavoured Sauce. Cannot be made dairy free.",
      },
      {
        name: "Latte",
        price: 4.6,
        description: "Signature blend espresso with steamed milk. " + ALLERGEN_NOTE,
      },
      {
        name: "Cappuccino",
        price: 4.6,
        description: "Espresso capped with frothy milk and chocolatey dusting. " + ALLERGEN_NOTE,
      },
      {
        name: "Flat White",
        price: 4.49,
        description: "Short intense espresso with sweet textured milk. " + ALLERGEN_NOTE,
      },
      {
        name: "Americano (white)",
        price: 4.05,
        description: "Espresso with hot water, enjoyed with a splash of milk. " + ALLERGEN_NOTE,
      },
      { name: "Americano", price: 4.05, description: "Espresso with hot water. From 18 kcal." },
      {
        name: "Mocha",
        price: 5,
        description: "Steamed chocolate milk blended with espresso. " + ALLERGEN_NOTE,
      },
    ],
  },
  {
    name: "Hot Chocolate and More",
    presetKey: "coffee",
    items: [
      {
        name: "Sweet Ube Hot Chocolate",
        price: 5.6,
        description: "Sweet Ube flavour hot chocolate with dreamy purple hue. " + ALLERGEN_NOTE,
      },
      {
        name: "Hot Chocolate",
        price: 4.75,
        description: "Rich, indulgent milky hot chocolate with chocolate dusting. " + ALLERGEN_NOTE,
      },
      {
        name: "White Hot Chocolate",
        price: 4.75,
        description: "Rich, creamy and silky smooth. Cannot be made dairy free. " + ALLERGEN_NOTE,
      },
      {
        name: "Chai Latte",
        price: 4.6,
        description: "Warm comforting milky tea with aromatic spices. " + ALLERGEN_NOTE,
      },
    ],
  },
  {
    name: "Teas and Infusions",
    presetKey: "coffee",
    items: [
      {
        name: "Mellow Mango with Zinc",
        price: 3.6,
        description: "Mango, camomile & green tea with zinc served with an orange slice. From 6 kcal. " + ALLERGEN_NOTE,
      },
      {
        name: "Spiced Apple with Vitamin B6",
        price: 3.6,
        description: "Apple, cinnamon & green tea with vitamin B6 served with a cinnamon stick. From 8 kcal. " + ALLERGEN_NOTE,
      },
      {
        name: "Citrus Zing with Vitamin C",
        price: 3.6,
        description: "Lemon, ginger & green tea with vitamin C served with a lemon slice. From 3 kcal. " + ALLERGEN_NOTE,
      },
      {
        name: "English Breakfast Tea",
        price: 3.49,
        description: "A bold and full bodied tea. " + ALLERGEN_NOTE,
      },
      {
        name: "Green Tea",
        price: 3.49,
        description: "Mellow steam dried green tea from Eastern China. " + ALLERGEN_NOTE,
      },
      {
        name: "Mint Tea",
        price: 3.49,
        description: "Glorious peppermint with sweet spearmint. From 1 kcal. " + ALLERGEN_NOTE,
      },
    ],
  },
  {
    name: "Chilled Drinks",
    presetKey: "drinks",
    items: [
      {
        name: "Costa Latte RTD 330ml",
        price: 3.25,
        description: "Slow-roasted Signature Blend iced Classic Latte. " + ALLERGEN_NOTE,
      },
      {
        name: "Costa Coffee Caramel Latte Bottle 330ml",
        price: 3.25,
        description: "Rich, smooth caramel latte on the go. " + ALLERGEN_NOTE,
      },
      {
        name: "Innocent Plus Citrus Shield Juice",
        price: 4,
        description: "Orange, apple, mandarin, carrot and ginger with vitamins C and B. " + ALLERGEN_NOTE,
      },
      {
        name: "Innocent Orange Juice 250ml",
        price: 3.15,
        description: "Smooth orange juice (250ml). " + ALLERGEN_NOTE,
      },
      {
        name: "Innocent Apple Juice 250ml",
        price: 3.15,
        description: "Sweet, crisp apple juice (250ml). " + ALLERGEN_NOTE,
      },
      {
        name: "Innocent Kids Smoothie",
        price: 2.25,
        description: "Blend of whole crushed fruit and pure juices (150ml). " + ALLERGEN_NOTE,
      },
      {
        name: "Coca-Cola Original Taste",
        price: 3.15,
        description: "Regular Coke (500ml). " + ALLERGEN_NOTE,
      },
      {
        name: "Diet Coke",
        price: 3.05,
        description: "Sugar and calorie-free (500ml). " + ALLERGEN_NOTE,
      },
      {
        name: "Coca-Cola Zero Sugar",
        price: 3.05,
        description: "Zero sugar Coke (500ml). " + ALLERGEN_NOTE,
      },
      {
        name: "Dr Pepper Zero 500ml",
        price: 3.05,
        description: "Sparkling blend of 23 fruit flavours, zero sugar. " + ALLERGEN_NOTE,
      },
      { name: "Fanta Orange", price: 3.05, description: "Refreshing Fanta (500ml). " + ALLERGEN_NOTE },
      { name: "Sprite Zero", price: 3.05, description: "Zero sugar Sprite (500ml). " + ALLERGEN_NOTE },
      {
        name: "Oasis Summer Fruits Zero 500ml",
        price: 3.05,
        description: "Fruity still juice drink, no added sugar. " + ALLERGEN_NOTE,
      },
      {
        name: "Oasis Exotic Fruits Zero 500ml",
        price: 3.05,
        description: "Mango and passion fruit flavours, no calories. " + ALLERGEN_NOTE,
      },
      {
        name: "SmartWater Still",
        price: 2.95,
        description: "Vapour distilled water with electrolytes (600ml). " + ALLERGEN_NOTE,
      },
      {
        name: "SmartWater Sparkling",
        price: 2.95,
        description: "Vapour distilled water with electrolytes, carbonated (600ml). " + ALLERGEN_NOTE,
      },
      {
        name: "Innocent Immunity Shot",
        price: 4,
        soldOut: true,
        description: "Health-boosting shot with vitamins A, C, D and calcium. " + ALLERGEN_NOTE,
      },
    ],
  },
  {
    name: "Sides & Extras",
    items: [
      {
        name: "Bonne Maman Bitter Orange Marmalade 30g",
        price: 0.4,
        description: "Orange Marmalade. " + ALLERGEN_NOTE,
      },
      { name: "Bonne Maman Honey 30g", price: 0.4, description: "Honey. " + ALLERGEN_NOTE },
      {
        name: "Bonne Maman Strawberry Conserve 30g",
        price: 0.4,
        description: "Strawberry Jam. " + ALLERGEN_NOTE,
      },
      {
        name: "Heinz Tomato Ketchup Sachets 10ml",
        price: 0.1,
        description: "Heinz Tomato Ketchup. " + ALLERGEN_NOTE,
      },
      {
        name: "HP Brown Sauce Sachets 10ml",
        price: 0.1,
        description: "HP Sauce, the original brown sauce since 1899. " + ALLERGEN_NOTE,
      },
    ],
  },
];
