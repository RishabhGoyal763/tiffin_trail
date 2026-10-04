/**
 * Seed data for restaurants, flexible menu items, and discount offers.
 * Used for initializing MongoDB catalogs and MySQL schema fixtures without duplication.
 */

const INITIAL_RESTAURANTS = [
  { id: "r1", name: "Punjabi Dhaba House", cuisine: "North Indian", rating: 4.6, time: "25-30 min", tags: ["Pure Veg Options", "North Indian"], bannerTheme: "warm_terracotta", acceptsCustomNotes: true },
  { id: "r2", name: "Southern Spice Co.", cuisine: "South Indian", rating: 4.5, time: "20-25 min", tags: ["South Indian", "Breakfast"], bannerTheme: "emerald_spice", acceptsCustomNotes: true },
  { id: "r3", name: "Golden Dragon Wok", cuisine: "Chinese", rating: 4.3, time: "30-35 min", tags: ["Chinese", "Non-Veg"], bannerTheme: "dragon_gold", acceptsCustomNotes: false },
  { id: "r4", name: "Bella Napoli", cuisine: "Italian", rating: 4.4, time: "35-40 min", tags: ["Italian", "Pizza"], bannerTheme: "rustic_olive", acceptsCustomNotes: true },
  { id: "r5", name: "Street Corner Chaat", cuisine: "Fast Food", rating: 4.7, time: "15-20 min", tags: ["Fast Food", "Pure Veg"], bannerTheme: "street_mustard", acceptsCustomNotes: false },
  { id: "r6", name: "Tandoor & Grill", cuisine: "North Indian", rating: 4.5, time: "30-35 min", tags: ["North Indian", "Non-Veg"], bannerTheme: "charcoal_ember", acceptsCustomNotes: true },
  { id: "r7", name: "Idli Express", cuisine: "South Indian", rating: 4.2, time: "18-22 min", tags: ["South Indian", "Pure Veg"], bannerTheme: "coastal_teal", acceptsCustomNotes: true },
  { id: "r8", name: "Sweet Tooth Dessert Bar", cuisine: "Desserts", rating: 4.8, time: "20-25 min", tags: ["Desserts", "Pure Veg"], bannerTheme: "rose_cardamom", acceptsCustomNotes: false }
];

const INITIAL_MENU = [
  { id: "m1", restaurantId: "r6", name: "Butter Chicken", category: "nonveg", cuisine: "North Indian", price: 260, image: "/images/butter_chicken.jpg", desc: "Char-grilled chicken simmered in a velvety tomato-butter gravy, finished with a swirl of cream.", spiceLevel: "Medium", tags: ["Bestseller", "Creamy", "Tandoori Special"], allergens: ["Dairy", "Nuts"] },
  { id: "m2", restaurantId: "r1", name: "Paneer Butter Masala", category: "veg", cuisine: "North Indian", price: 220, image: "/images/paneer_butter_masala.jpg", desc: "Soft paneer cubes in a rich, mildly sweet tomato-cashew gravy. A thali favourite.", spiceLevel: "Mild", tags: ["Vegetarian", "Popular"], allergens: ["Dairy", "Cashew"] },
  { id: "m3", restaurantId: "r1", name: "Dal Makhani", category: "veg", cuisine: "North Indian", price: 180, image: "/images/dal_makhani.jpg", desc: "Slow-simmered black lentils finished with butter and a touch of cream, overnight-cooked flavour.", spiceLevel: "Mild", tags: ["Slow-Cooked", "Vegetarian"], allergens: ["Dairy"] },
  { id: "m4", restaurantId: "r2", name: "Masala Dosa", category: "veg", cuisine: "South Indian", price: 120, image: "/images/masala_dosa.jpg", desc: "Crisp fermented crepe filled with spiced potato masala, served with sambar and two chutneys.", spiceLevel: "Medium", tags: ["Crispy", "Authentic", "Breakfast"], allergens: ["Mustard"] },
  { id: "m5", restaurantId: "r2", name: "Idli Vada Combo", category: "veg", cuisine: "South Indian", price: 110, image: "/images/idli_vada.jpg", desc: "Two steamed rice-lentil cakes and one crispy medu vada, served piping hot with sambar.", spiceLevel: "Mild", tags: ["Healthy", "Steamed", "Crisp"], allergens: [] },
  { id: "m6", restaurantId: "r3", name: "Veg Hakka Noodles", category: "veg", cuisine: "Chinese", price: 160, image: "/images/veg_hakka_noodles.jpg", desc: "Wok-tossed noodles with shredded cabbage, carrots, bell peppers, and savoury soy-garlic seasoning.", spiceLevel: "Medium", tags: ["Wok-Tossed", "Indo-Chinese"], allergens: ["Gluten", "Soy"] },
  { id: "m7", restaurantId: "r3", name: "Chilli Chicken Dry", category: "nonveg", cuisine: "Chinese", price: 240, image: "/images/chilli_chicken.jpg", desc: "Crisp fried chicken bites tossed with green chillies, onions, capsicum, and spicy soy-chilli sauce.", spiceLevel: "Hot", tags: ["Spicy", "Starter"], allergens: ["Soy", "Gluten"] },
  { id: "m8", restaurantId: "r4", name: "Margherita Pizza", category: "veg", cuisine: "Italian", price: 250, image: "/images/margherita_pizza.jpg", desc: "Classic Neapolitan crust, crushed San Marzano tomato sauce, fresh mozzarella, and fragrant basil.", spiceLevel: "None", tags: ["Wood-Fired", "Classic"], allergens: ["Gluten", "Dairy"] },
  { id: "m9", restaurantId: "r4", name: "Penne Arrabbiata", category: "veg", cuisine: "Italian", price: 230, image: "/images/penne_arrabbiata.jpg", desc: "Al dente penne pasta in a fiery garlic and red chilli tomato sauce, finished with parmesan.", spiceLevel: "Hot", tags: ["Fiery", "Al Dente"], allergens: ["Gluten", "Dairy"] },
  { id: "m10", restaurantId: "r5", name: "Pani Puri (8 pcs)", category: "veg", cuisine: "Fast Food", price: 70, image: "/images/pani_puri.jpg", desc: "Crisp hollow puris stuffed with potato-sprout filling, filled to the brim with chilled spiced water.", spiceLevel: "Spicy & Tangy", tags: ["Street Food", "Crunchy"], allergens: ["Gluten"] },
  { id: "m11", restaurantId: "r5", name: "Dahi Bhalla", category: "veg", cuisine: "Fast Food", price: 90, image: "/images/dahi_bhalla.jpg", desc: "Lentil dumplings soaked in thick sweet curd, topped with tangy tamarind and zesty mint chutneys.", spiceLevel: "Sweet & Tangy", tags: ["Chilled", "Digestive"], allergens: ["Dairy"] },
  { id: "m12", restaurantId: "r6", name: "Chicken Tikka (6 pcs)", category: "nonveg", cuisine: "North Indian", price: 270, image: "/images/chicken_tikka.jpg", desc: "Boneless chicken marinated in tandoori yoghurt masala and roasted to smoky perfection.", spiceLevel: "Medium-Hot", tags: ["Smoky", "Clay Oven"], allergens: ["Dairy"] },
  { id: "m13", restaurantId: "r7", name: "Ghee Podi Idli", category: "veg", cuisine: "South Indian", price: 130, image: "/images/ghee_podi_idli.jpg", desc: "Mini button idlis tossed generously in aromatic gun-powder spice and melted desi ghee.", spiceLevel: "Spicy", tags: ["Desi Ghee", "Gunpowder"], allergens: ["Dairy"] },
  { id: "m14", restaurantId: "r7", name: "Filter Coffee", category: "veg", cuisine: "South Indian", price: 60, image: "/images/filter_coffee.jpg", desc: "Authentic South Indian chicory-blend decoction frothed with full-cream milk in a traditional dabarah.", spiceLevel: "None", tags: ["Frothy", "Fresh Brew"], allergens: ["Dairy"] },
  { id: "m15", restaurantId: "r8", name: "Gulab Jamun (2 pcs)", category: "veg", cuisine: "Desserts", price: 80, image: "/images/gulab_jamun.jpg", desc: "Soft, warm milk-solid dumplings soaked in rose-cardamom sugar syrup.", spiceLevel: "Sweet", tags: ["Warm", "Mithai"], allergens: ["Dairy"] },
  { id: "m16", restaurantId: "r8", name: "Rasmalai (2 pcs)", category: "veg", cuisine: "Desserts", price: 110, image: "/images/rasmalai.jpg", desc: "Delicate chenna patties soaked in chilled, saffron-pistachio infused thickened milk.", spiceLevel: "Sweet", tags: ["Saffron", "Kesar Pista"], allergens: ["Dairy", "Nuts"] }
];

const INITIAL_OFFERS = [
  { id: "o1", code: "FIRST50", title: "50% off your first dabba", description: "New here? Your first order is on us — up to ₹150 off.", theme: "tt-offer-mustard", icon: "bi-gift-fill", terms: { minOrder: 0, maxDiscount: 150, validForNewUsersOnly: true } },
  { id: "o2", code: "FREESHIP", title: "Free delivery over ₹399", description: "Fill the thali, skip the delivery fee. Valid every day, all kitchens.", theme: "tt-offer-chili", icon: "bi-truck", terms: { minOrder: 399, maxDiscount: 40, validEveryday: true } },
  { id: "o3", code: "SWEET20", title: "20% off all desserts", description: "Gulab jamun, rasmalai, kulfi — because dinner needs an ending.", theme: "tt-offer-teal", icon: "bi-percent", terms: { minOrder: 150, category: "Desserts" } }
];

module.exports = {
  INITIAL_RESTAURANTS,
  INITIAL_MENU,
  INITIAL_OFFERS
};
