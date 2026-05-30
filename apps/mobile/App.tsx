import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { ApiError, apiUrl, checkApiHealth, sendAssistantMessage, sendMoodMessage } from "./src/api";
import { applyCartAction, applyCartActions, formatMoney } from "./src/cart";
import { categories, menu } from "./src/data/menu";
import { moodOptions } from "./src/data/moods";
import { CartAction, CartLine, ChatMessage, MenuItem, MoodId, MoodResult } from "./src/types";

const starterMessages: ChatMessage[] = [
  {
    id: "intro",
    role: "assistant",
    text: "Welcome in. What kind of meal are you in the mood for today?"
  }
];

type ApiStatus = "checking" | "online" | "offline";
type ThemeId = "earth" | "citrus" | "tropical";

const themes = {
  earth: {
    id: "earth",
    name: "Earth Bistro",
    caption: "Premium, warm, restaurant-led",
    background: "#FFF9F0",
    surface: "#FFFFFF",
    primary: "#E4572E",
    secondary: "#344E41",
    accent: "#F4A261",
    text: "#162016",
    muted: "#6B705C",
    success: "#344E41",
    softTeal: "#ECF2E8",
    softOrange: "#FFF3EA",
    softYellow: "#F4F0E8",
    border: "#E7E1D5",
    danger: "#7A2E18",
    headerEnd: "#F5F7F1",
    heroText: "#DCE5D7"
  },
  citrus: {
    id: "citrus",
    name: "Fresh Citrus",
    caption: "Bright, friendly, energetic",
    background: "#FFFDF5",
    surface: "#FFFFFF",
    primary: "#FF6B35",
    secondary: "#2EC4B6",
    accent: "#FFD166",
    text: "#1F2933",
    muted: "#6B7280",
    success: "#2F9E44",
    softTeal: "#E8FAF7",
    softOrange: "#FFF0E8",
    softYellow: "#FFF8DC",
    border: "#F3E5D8",
    danger: "#C2410C",
    headerEnd: "#E8FAF7",
    heroText: "#EFFFFC"
  },
  tropical: {
    id: "tropical",
    name: "Tropical Fresh",
    caption: "Colorful, young, playful",
    background: "#F7FFF7",
    surface: "#FFFFFF",
    primary: "#FF9F1C",
    secondary: "#00B4D8",
    accent: "#FF5D8F",
    text: "#102A43",
    muted: "#627D98",
    success: "#2F9E44",
    softTeal: "#E7F8FF",
    softOrange: "#FFF2DE",
    softYellow: "#FFF7D6",
    border: "#DCEEF5",
    danger: "#B42318",
    headerEnd: "#E7F8FF",
    heroText: "#ECFEFF"
  }
} as const;

const defaultThemeId: ThemeId = "earth";

const dishAssets: Record<string, number> = {
  "fast-food": require("./assets/dishes/fast-food.png"),
  burger: require("./assets/dishes/burger.png"),
  fries: require("./assets/dishes/fries.png"),
  pasta: require("./assets/dishes/pasta.png"),
  pizza: require("./assets/dishes/pizza.png"),
  taco: require("./assets/dishes/taco.png"),
  burrito: require("./assets/dishes/burrito.png"),
  bowl: require("./assets/dishes/bowl.png"),
  noodles: require("./assets/dishes/noodles.png"),
  sushi: require("./assets/dishes/sushi.png"),
  wok: require("./assets/dishes/wok.png"),
  steak: require("./assets/dishes/steak.png"),
  poke: require("./assets/dishes/poke.png"),
  curry: require("./assets/dishes/curry.png"),
  mac: require("./assets/dishes/mac.png"),
  dessert: require("./assets/dishes/dessert.png"),
  drink: require("./assets/dishes/drink.png"),
  juice: require("./assets/dishes/juice.png"),
  "cold-drink": require("./assets/dishes/cold-drink.png"),
  "hot-drink": require("./assets/dishes/hot-drink.png"),
  "hot-cocoa": require("./assets/dishes/hot-cocoa.png"),
  "ginger-ale": require("./assets/dishes/ginger-ale.png"),
  "iced-tea": require("./assets/dishes/iced-tea.png"),
  "cold-pressed-juice": require("./assets/dishes/cold-pressed-juice.png"),
  kombucha: require("./assets/dishes/kombucha.png"),
  "sparkling-soda": require("./assets/dishes/sparkling-soda.png"),
  "warm-latte": require("./assets/dishes/warm-latte.png"),
  "malt-beverage": require("./assets/dishes/malt-beverage.png"),
  "espresso-tonic": require("./assets/dishes/espresso-tonic.png"),
  milkshake: require("./assets/dishes/milkshake.png"),
  water: require("./assets/dishes/water.png"),
  "fried-chicken": require("./assets/dishes/fried-chicken.png"),
  "butter-chicken": require("./assets/dishes/butter-chicken.png"),
  "choco-lava": require("./assets/dishes/choco-lava.png"),
  cheesecake: require("./assets/dishes/cheesecake.png"),
  "mexican-bowl": require("./assets/dishes/mexican-bowl.png"),
  nachos: require("./assets/dishes/nachos.png"),
  ramen: require("./assets/dishes/ramen.png"),
  mezze: require("./assets/dishes/mezze.png"),
  salad: require("./assets/dishes/salad.png"),
  toast: require("./assets/dishes/toast.png")
};

export default function App() {
  const [activeCategory, setActiveCategory] = useState<(typeof categories)[number]>("American");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>(starterMessages);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [selectedMood, setSelectedMood] = useState<MoodResult | null>(null);
  const [isMoodGuideOpen, setIsMoodGuideOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [drinkPairing, setDrinkPairing] = useState<MenuItem | null>(null);
  const [apiStatus, setApiStatus] = useState<ApiStatus>("checking");
  const [apiStatusText, setApiStatusText] = useState("Checking kitchen");
  const [lastOrder, setLastOrder] = useState<{ id: string; total: number; eta: string } | null>(null);
  const [themeId, setThemeId] = useState<ThemeId>(defaultThemeId);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const palette = themes[themeId];
  const styles = useMemo(() => createStyles(palette), [palette]);

  const visibleMenu = useMemo(
    () => menu.filter((item) => item.category === activeCategory),
    [activeCategory]
  );
  const subtotal = useMemo(() => cart.reduce((sum, line) => sum + line.price * line.quantity, 0), [cart]);
  const itemCount = useMemo(() => cart.reduce((sum, line) => sum + line.quantity, 0), [cart]);
  const serviceFee = useMemo(() => subtotal * 0.05, [subtotal]);
  const total = useMemo(() => subtotal + serviceFee, [subtotal, serviceFee]);

  useEffect(() => {
    let isMounted = true;

    checkApiHealth()
      .then((health) => {
        if (!isMounted) return;
        setApiStatus(health.ok ? "online" : "offline");
        setApiStatusText(health.openaiConfigured ? "AI kitchen live" : "Local mood engine");
      })
      .catch(() => {
        if (!isMounted) return;
        setApiStatus("offline");
        setApiStatusText("Offline mode");
      });

    return () => {
      isMounted = false;
    };
  }, []);

  function suggestDrinkForFood(item: MenuItem | null | undefined) {
    if (!item || item.category === "Drinks") return;
    setDrinkPairing(findDrinkPairing(item));
  }

  function suggestDrinkFromActions(actions: CartAction[]) {
    const firstFoodAction = actions.find((action) => {
      if (action.type !== "add_item" && action.type !== "set_quantity") return false;
      if (action.quantity <= 0) return false;
      return menu.find((item) => item.id === action.itemId)?.category !== "Drinks";
    });
    const food =
      firstFoodAction?.type === "add_item" || firstFoodAction?.type === "set_quantity"
        ? menu.find((item) => item.id === firstFoodAction.itemId)
        : null;
    suggestDrinkForFood(food);
  }

  function addItem(item: MenuItem) {
    setLastOrder(null);
    setCart((current) =>
      applyCartAction(current, { type: "add_item", itemId: item.id, quantity: 1 }, menu)
    );
    suggestDrinkForFood(item);
  }

  function changeQuantity(line: CartLine, delta: number) {
    setCart((current) =>
      applyCartAction(
        current,
        { type: "set_quantity", itemId: line.itemId, quantity: line.quantity + delta },
        menu
      )
    );
  }

  function addRecommendation(actions: CartAction[], label = "suggested picks") {
    setLastOrder(null);
    setCart((current) => applyCartActions(current, actions, menu));
    suggestDrinkFromActions(actions);
    setMessages((current) => [
      ...current,
      {
        id: `${Date.now()}-added-suggestion`,
        role: "assistant",
        text: `Added the ${label} to your cart. You can still adjust anything before checkout.`
      }
    ]);
  }

  function showCartInChat() {
    setIsCartOpen(true);
    setMessages((current) => [
      ...current,
      {
        id: `${Date.now()}-cart-summary`,
        role: "assistant",
        text: formatCartSummary(cart, subtotal, serviceFee, total)
      }
    ]);
  }

  function confirmOrder() {
    if (cart.length === 0) return;
    const orderId = `IB-${Date.now().toString().slice(-6)}`;
    setLastOrder({ id: orderId, total, eta: "18-24 min" });
    setMessages((current) => [
      ...current,
      {
        id: `${Date.now()}-order-confirmed`,
        role: "assistant",
        text: `Order ${orderId} is confirmed. Total paid: ${formatMoney(total)}. Estimated pickup: 18-24 min.`
      }
    ]);
    setCart([]);
    setIsCartOpen(false);
  }

  async function chooseMood(label: string) {
    if (isSending) return;

    setIsSending(true);
    setMessages((current) => [
      ...current,
      { id: `${Date.now()}-mood-user`, role: "user", text: `I am in a ${label.toLowerCase()} mood.` }
    ]);

    try {
      const result = await sendMoodMessage(label);
      setSelectedMood(result);
      setIsMoodGuideOpen(false);
      setMessages((current) => [
        ...current,
        { id: `${Date.now()}-mood-assistant`, role: "assistant", text: result.reply }
      ]);
    } catch (error) {
      const fallback = localMood(label, label);
      setApiStatus("offline");
      setApiStatusText("Offline mode");
      setSelectedMood(fallback);
      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-mood-offline`,
          role: "assistant",
          text: `${fallback.reply} ${formatOfflineReason(error)}`
        }
      ]);
    } finally {
      setIsSending(false);
    }
  }

  async function submitMessage(text = draft) {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    setDraft("");
    setIsSending(true);
    setMessages((current) => [
      ...current,
      { id: `${Date.now()}-user`, role: "user", text: trimmed }
    ]);

    try {
      if (isCartQuestion(trimmed)) {
        showCartInChat();
        return;
      }

      const moodResult = shouldTreatAsMood(trimmed) ? await sendMoodMessage(trimmed) : null;
      if (moodResult) {
        setSelectedMood(moodResult);
        setIsMoodGuideOpen(false);
        setMessages((current) => [
          ...current,
          { id: `${Date.now()}-mood-from-text`, role: "assistant", text: moodResult.reply }
        ]);
        return;
      }

      const result = await sendAssistantMessage(trimmed, cart);
      setCart((current) => result.cart ?? applyCartActions(current, result.actions, menu));
      suggestDrinkFromActions(result.actions);
      setMessages((current) => [
        ...current,
        { id: `${Date.now()}-assistant`, role: "assistant", text: result.reply }
      ]);
    } catch (error) {
      setApiStatus("offline");
      setApiStatusText("Offline mode");
      if (shouldTreatAsMood(trimmed)) {
        const fallbackMood = localMood(trimmed, trimmed);
        setSelectedMood(fallbackMood);
        setIsMoodGuideOpen(false);
        setMessages((current) => [
          ...current,
          {
            id: `${Date.now()}-mood-offline`,
            role: "assistant",
            text: `${fallbackMood.reply} ${formatOfflineReason(error)}`
          }
        ]);
        return;
      }

      const fallback = localAssistant(trimmed);
      setCart((current) => applyCartActions(current, fallback.actions, menu));
      suggestDrinkFromActions(fallback.actions);
      setMessages((current) => [
        ...current,
        {
          id: `${Date.now()}-offline`,
          role: "assistant",
          text: `${fallback.reply} ${formatOfflineReason(error)}`
        }
      ]);
    } finally {
      setIsSending(false);
    }
  }

  function renderAssistantPanel() {
    return (
      <View style={styles.assistantPanel}>
        <View style={styles.assistantHeader}>
          <View>
            <Text style={styles.sectionTitle}>Bistro Assistant</Text>
            <Text style={styles.muted}>Mood discovery, nutrient match, and cart control</Text>
          </View>
          {isSending ? (
            <ActivityIndicator color={palette.primary} />
          ) : (
            <Ionicons name="chatbubble-ellipses-outline" size={23} color={palette.secondary} />
          )}
        </View>

        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={[styles.bubble, item.role === "user" ? styles.userBubble : styles.assistantBubble]}>
              <Text style={[styles.bubbleText, item.role === "user" && styles.userBubbleText]}>{item.text}</Text>
            </View>
          )}
        />

        <View style={styles.composer}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Tell me your mood or what to order"
            placeholderTextColor={palette.muted}
            style={styles.input}
            returnKeyType="send"
            onSubmitEditing={() => submitMessage()}
          />
          <Pressable onPress={() => submitMessage()} style={styles.sendButton}>
            <Ionicons name="arrow-up" size={18} color={palette.surface} />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={styles.screen}
      >
        <LinearGradient colors={[palette.background, palette.softTeal]} style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.kicker}>AI mood-led ordering</Text>
              <Text style={styles.title}>Intelligent Bistro</Text>
            </View>
            <View style={styles.headerActions}>
              <ApiStatusPill status={apiStatus} label={apiStatusText} styles={styles} palette={palette} />
              <View style={styles.headerButtonRow}>
                <Pressable
                  style={styles.iconPill}
                  onPress={() => setIsThemeOpen(true)}
                  hitSlop={10}
                  accessibilityLabel="Choose app theme"
                >
                  <Ionicons name="color-palette-outline" size={18} color={palette.text} />
                </Pressable>
                <Pressable
                  style={styles.cartPill}
                  onPress={() => setIsCartOpen(true)}
                  hitSlop={10}
                >
                  <Ionicons name="bag-handle-outline" size={18} color={palette.text} />
                  <Text style={styles.cartPillText}>{itemCount}</Text>
                </Pressable>
              </View>
            </View>
          </View>
          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <Ionicons name="sparkles" size={22} color={palette.surface} />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>AI-first ordering.</Text>
              <Text style={styles.heroText}>Type naturally below; the assistant turns mood into nutrient-led picks.</Text>
            </View>
          </View>
        </LinearGradient>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentInner}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {lastOrder ? (
            <View style={styles.orderSuccess}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark" size={18} color={palette.surface} />
              </View>
              <View style={styles.orderSuccessText}>
                <Text style={styles.orderSuccessTitle}>Order {lastOrder.id} confirmed</Text>
                <Text style={styles.muted}>
                  {formatMoney(lastOrder.total)} paid / pickup in {lastOrder.eta}
                </Text>
              </View>
            </View>
          ) : null}

          {renderAssistantPanel()}

          <Pressable style={styles.expandHeader} onPress={() => setIsMoodGuideOpen((open) => !open)}>
            <View>
              <Text style={styles.sectionTitle}>Mood Match</Text>
              <Text style={styles.muted}>Write your mood first; examples are optional</Text>
            </View>
            <View style={styles.expandButton}>
              <Text style={styles.expandButtonText}>{isMoodGuideOpen ? "Hide" : "Show"}</Text>
              <Ionicons name={isMoodGuideOpen ? "chevron-up" : "chevron-down"} size={16} color={palette.secondary} />
            </View>
          </Pressable>

          {isMoodGuideOpen ? (
            <View style={styles.moodGrid}>
              {moodOptions.map((mood) => (
                <Pressable
                  key={mood.id}
                  onPress={() => chooseMood(mood.label)}
                  style={[
                    styles.moodCard,
                    selectedMood?.mood === mood.id && styles.activeMoodCard
                  ]}
                >
                  <View style={styles.moodIcon}>
                    <Ionicons name={mood.icon as keyof typeof Ionicons.glyphMap} size={18} color={palette.secondary} />
                  </View>
                  <Text style={styles.moodLabel}>{mood.label}</Text>
                  <Text style={styles.moodPrompt}>{mood.prompt}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {selectedMood ? (
            <View style={styles.recommendationPanel}>
              <View style={styles.recommendationHeader}>
                <View>
                  <Text style={styles.recommendationTitle}>{selectedMood.label} Picks</Text>
                  <Text style={styles.muted}>{Math.round(selectedMood.confidence * 100)}% mood match</Text>
                </View>
                <Pressable
                  onPress={() => addRecommendation(selectedMood.actions, selectedMood.label.toLowerCase())}
                  style={styles.recommendationButton}
                >
                  <Ionicons name="bag-add-outline" size={16} color={palette.surface} />
                  <Text style={styles.recommendationButtonText}>Add meal</Text>
                </Pressable>
              </View>
              {selectedMood.highlight ? (
                <View style={styles.moodQuoteBox}>
                  <Text style={styles.moodQuoteText}>{selectedMood.highlight}</Text>
                </View>
              ) : null}
              {selectedMood.nutrientNeed ? (
                <View style={styles.nutritionBox}>
                  <View style={styles.nutritionHeader}>
                    <Ionicons name="nutrition-outline" size={16} color={palette.secondary} />
                    <Text style={styles.nutritionTitle}>Body cue</Text>
                  </View>
                  <Text style={styles.nutritionCopy}>{selectedMood.nutrientNeed}</Text>
                  {selectedMood.nutritionFocus?.length ? (
                    <View style={styles.nutritionChips}>
                      {selectedMood.nutritionFocus.map((nutrient) => (
                        <View key={nutrient} style={styles.nutritionChip}>
                          <Text style={styles.nutritionChipText}>{nutrient}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              ) : null}
              {selectedMood.recommendations.map((item) => (
                <View key={item.itemId} style={styles.recommendationLine}>
                  <DishImage image={item.image} icon={item.icon} accent={item.accent ?? palette.primary} name={item.name} size={58} />
                  <View style={styles.recommendationText}>
                    <Text style={styles.cartItemName}>{item.name}</Text>
                    <Text style={styles.muted}>{item.reason}</Text>
                  </View>
                  <Text style={styles.price}>{formatMoney(item.price)}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Menu</Text>
            <Text style={styles.muted}>{visibleMenu.length} picks</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
            {categories.map((category) => (
              <Pressable
                key={category}
                onPress={() => setActiveCategory(category)}
                style={[styles.tab, activeCategory === category && styles.activeTab]}
              >
                <Text style={[styles.tabText, activeCategory === category && styles.activeTabText]}>
                  {category}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.menuGrid}>
            {visibleMenu.map((item) => (
              <Pressable key={item.id} onPress={() => addItem(item)} style={styles.menuCard}>
                <DishImage image={item.image} icon={item.icon} accent={item.accent} name={item.name} size={82} />
                <View style={styles.menuInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.tags}>{item.tags.join(" / ")}</Text>
                  <View style={styles.cardFooter}>
                    <Text style={styles.price}>{formatMoney(item.price)}</Text>
                    <View style={styles.addButton}>
                      <Ionicons name="add" size={18} color={palette.surface} />
                    </View>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Cart</Text>
            <Text style={styles.muted}>{formatMoney(subtotal)}</Text>
          </View>

          <View style={styles.cartPanel}>
            {cart.length === 0 ? (
              <View style={styles.emptyCart}>
                <Ionicons name="receipt-outline" size={26} color={palette.muted} />
                <Text style={styles.emptyText}>Your cart is ready for a mood or an instruction.</Text>
              </View>
            ) : (
              cart.map((line) => (
                <View key={line.itemId} style={styles.cartLine}>
                  <View style={styles.cartLineText}>
                    <Text style={styles.cartItemName}>{line.name}</Text>
                    <Text style={styles.muted}>
                      {formatMoney(line.price)} each{line.modifiers?.size ? ` / ${line.modifiers.size}` : ""}
                    </Text>
                  </View>
                  <View style={styles.quantityStepper}>
                    <Pressable onPress={() => changeQuantity(line, -1)} style={styles.stepButton}>
                      <Ionicons name="remove" size={15} color={palette.text} />
                    </Pressable>
                    <Text style={styles.quantity}>{line.quantity}</Text>
                    <Pressable onPress={() => changeQuantity(line, 1)} style={styles.stepButton}>
                      <Ionicons name="add" size={15} color={palette.text} />
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </View>

        </ScrollView>
        {drinkPairing && !isCartOpen ? (
          <ComboPanel
            drink={drinkPairing}
            onAdd={() => {
              addItem(drinkPairing);
              setDrinkPairing(null);
            }}
            onDismiss={() => setDrinkPairing(null)}
            styles={styles}
            palette={palette}
          />
        ) : null}
        {isThemeOpen ? (
          <ThemeSheet
            activeThemeId={themeId}
            onSelect={(nextTheme) => {
              setThemeId(nextTheme);
              setIsThemeOpen(false);
            }}
            onClose={() => setIsThemeOpen(false)}
            styles={styles}
          />
        ) : null}
        {isCartOpen ? (
          <View style={styles.cartOverlay}>
            <Pressable style={styles.cartScrim} onPress={() => setIsCartOpen(false)} />
            <View style={styles.checkoutSheet}>
              <View style={styles.checkoutGrabber} />
              <View style={styles.checkoutHeader}>
                <View>
                  <Text style={styles.checkoutTitle}>Your Cart</Text>
                  <Text style={styles.muted}>{itemCount} items ready for checkout</Text>
                </View>
                <Pressable onPress={() => setIsCartOpen(false)} style={styles.iconButton}>
                  <Ionicons name="close" size={18} color={palette.text} />
                </Pressable>
              </View>
              {cart.length === 0 ? (
                <View style={styles.emptyCheckout}>
                  <Ionicons name="bag-outline" size={26} color={palette.muted} />
                  <Text style={styles.emptyText}>No items yet. Ask the assistant for a mood-based meal.</Text>
                </View>
              ) : (
                <>
                  <ScrollView style={styles.checkoutList} showsVerticalScrollIndicator={false}>
                    {cart.map((line) => (
                      <View key={line.itemId} style={styles.checkoutLine}>
                        <View style={styles.cartLineText}>
                          <Text style={styles.cartItemName}>{line.name}</Text>
                          <Text style={styles.muted}>
                            {line.quantity} x {formatMoney(line.price)}
                          </Text>
                        </View>
                        <View style={styles.checkoutControls}>
                          <Text style={styles.price}>{formatMoney(line.quantity * line.price)}</Text>
                          <View style={styles.quantityStepper}>
                            <Pressable
                              onPress={() => changeQuantity(line, -1)}
                              style={styles.stepButton}
                              accessibilityLabel={`Remove one ${line.name}`}
                            >
                              <Ionicons name={line.quantity === 1 ? "trash-outline" : "remove"} size={15} color={palette.text} />
                            </Pressable>
                            <Text style={styles.quantity}>{line.quantity}</Text>
                            <Pressable
                              onPress={() => changeQuantity(line, 1)}
                              style={styles.stepButton}
                              accessibilityLabel={`Add one ${line.name}`}
                            >
                              <Ionicons name="add" size={15} color={palette.text} />
                            </Pressable>
                          </View>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                  <View style={styles.billBox}>
                    <BillRow label="Subtotal" value={formatMoney(subtotal)} styles={styles} />
                    <BillRow label="Service" value={formatMoney(serviceFee)} styles={styles} />
                    <BillRow label="Total" value={formatMoney(total)} strong styles={styles} />
                  </View>
                  <Pressable onPress={confirmOrder} style={styles.checkoutButton}>
                    <Ionicons name="checkmark-circle-outline" size={18} color={palette.surface} />
                    <Text style={styles.checkoutButtonText}>Confirm order</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function shouldTreatAsMood(message: string) {
  const lower = message.toLowerCase();
  const isOrderCommand = /\b(add|remove|clear|set|change|order|get|give me|cart|water|fries|pizza|burger|sandwich|pasta|sushi|ramen|nachos|chicken|drink)\b/.test(lower);
  if (isOrderCommand) return false;

  const moodWords = [
    "mood",
    "feel",
    "feeling",
    "lazy",
    "tired",
    "energetic",
    "happy",
    "sad",
    "stressed",
    "relaxed",
    "balanced",
    "steady",
    "wholesome",
    "surprise",
    "anxious",
    "calm"
  ];

  return moodWords.some((word) => lower.includes(word)) || lower.split(/\s+/).length >= 3;
}

function isCartQuestion(message: string) {
  const lower = message.toLowerCase();
  return /\b(show|view|see|display|what|total|bill|checkout)\b/.test(lower) && /\b(cart|bag|order|bill|total|items)\b/.test(lower);
}

function findDrinkPairing(item: MenuItem) {
  const map: Record<string, string> = {
    "spicy-chicken": "iced-tea",
    "truffle-burger": "sparkling-soda",
    cheeseburger: "sparkling-soda",
    fries: "sparkling-soda",
    "fried-chicken": "iced-tea",
    pizza: "ginger-ale",
    tacos: "cold-pressed-juice",
    "chicken-burrito": "cold-pressed-juice",
    "alfredo-pasta": "espresso-tonic",
    "mac-cheese": "warm-latte",
    "classic-mac": "hot-cocoa",
    "butter-chicken": "malt-beverage",
    "rainbow-sushi": "kombucha",
    "poke-bowl": "kombucha",
    "authentic-ramen": "ginger-ale",
    "mezze-spread": "iced-tea",
    "mediterranean-bowl": "iced-tea",
    "vietnamese-bowl": "cold-pressed-juice",
    "mexican-bowl": "cold-pressed-juice",
    "thai-curry": "ginger-ale",
    "rare-steak": "espresso-tonic",
    "greek-salad": "still-water",
    "avocado-toast": "cold-pressed-juice",
    "loaded-nachos": "sparkling-soda",
    "colorful-stir-fry": "kombucha",
    "choco-lava": "warm-latte",
    cheesecake: "espresso-tonic"
  };

  return menu.find((entry) => entry.id === (map[item.id] ?? "still-water")) ?? menu.find((entry) => entry.id === "still-water")!;
}

function formatCartSummary(cart: CartLine[], subtotal: number, serviceFee: number, total: number) {
  if (cart.length === 0) return "Your cart is empty right now.";

  const lines = cart.map((line) => `${line.quantity} x ${line.name} - ${formatMoney(line.quantity * line.price)}`);
  return [
    "Here is your cart:",
    ...lines,
    `Subtotal: ${formatMoney(subtotal)}`,
    `Service: ${formatMoney(serviceFee)}`,
    `Total: ${formatMoney(total)}`
  ].join("\n");
}

function contextualMoodLine(moodId: MoodId, input: string) {
  const taglines = localMoodTaglines[moodId];
  return taglines[stableIndex(input || moodId, taglines.length)];
}

function stableIndex(value: string, size: number) {
  let hash = 0;
  for (const char of value.toLowerCase()) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash % size;
}

function localMood(label: string, sourceText = label): MoodResult {
  const mood = moodOptions.find((option) => label.toLowerCase().includes(option.label.toLowerCase())) ?? moodOptions[0];
  const itemIds =
    mood.id === "stressed"
      ? ["fried-chicken", "loaded-nachos", "pizza"]
      : mood.id === "energetic"
        ? ["mediterranean-bowl", "vietnamese-bowl", "cold-pressed-juice"]
        : mood.id === "happy"
          ? ["rainbow-sushi", "poke-bowl", "thai-curry"]
          : mood.id === "sad"
            ? ["classic-mac", "butter-chicken", "choco-lava"]
            : mood.id === "relaxed"
              ? ["authentic-ramen", "mezze-spread", "ginger-ale"]
              : mood.id === "balanced"
                ? ["greek-salad", "mediterranean-bowl", "spicy-chicken"]
                : ["pizza", "truffle-burger", "fries"];
  const recommendations = itemIds.map((itemId) => {
    const item = menu.find((entry) => entry.id === itemId)!;
    return {
      itemId,
      name: item.name,
      price: item.price,
      icon: item.icon,
      accent: item.accent,
      image: item.image,
      reason: localNutritionReason[mood.id]
    };
  });
  return {
    mood: mood.id,
    label: mood.label,
    confidence: 0.7,
    highlight: contextualMoodLine(mood.id, sourceText),
    nutrientNeed: localNutrientNeed[mood.id],
    nutritionFocus: localNutritionFocus[mood.id],
    reply: `${mood.label} sounds right. ${localNutrientNeed[mood.id]} ${contextualMoodLine(mood.id, sourceText)} I would suggest ${recommendations.map((item) => item.name).join(", ")}.`,
    recommendations,
    actions: itemIds.map((itemId) => ({ type: "add_item", itemId, quantity: 1 }))
  };
}

const localMoodTaglines = {
  lazy: [
    "Low battery mode deserves low-effort fuel. Grab from below.",
    "Let's keep the work light and the plate satisfying. Grab from below.",
    "No big decisions today; just steady comfort. Grab from below."
  ],
  energetic: [
    "Food is fuel, and today the engine is already warm. Grab from below.",
    "Let's match that momentum with clean, steady fuel. Grab from below.",
    "Active energy needs a plate that can keep up. Grab from below."
  ],
  stressed: [
    "Stressed is nothing but desserts spelled in the wrong way. Grab from below.",
    "Crunch, comfort, and a calmer landing. Grab from below.",
    "Let's take the edge off without sending your energy on a roller coaster. Grab from below."
  ],
  relaxed: [
    "Good food adds to your relaxation. Grab from below.",
    "Slow mood, layered flavors, no rush. Grab from below.",
    "Let's keep the plate calm, colorful, and worth lingering over. Grab from below."
  ],
  sad: [
    "No man is lonely while eating spaghetti. Grab from below.",
    "A warm plate cannot fix everything, but it can sit with you kindly. Grab from below.",
    "Let's keep this soft, warm, and steady. Grab from below."
  ],
  happy: [
    "Laughter is brightest in the place where food is. Grab from below.",
    "Good mood, good color, good plate. Grab from below.",
    "Let's make the meal feel as bright as the mood. Grab from below."
  ],
  balanced: [
    "Our food will be very close to your mother's cooking. Grab from below.",
    "Balanced mood, balanced plate. Grab from below.",
    "Let's keep it complete, clean, and satisfying. Grab from below."
  ]
};

const localNutrientNeed = {
  lazy: "Your body may need steady carbohydrates, protein, and hydration without a high-effort meal.",
  energetic: "Your body may need quality carbohydrates, lean protein, and fluids to keep momentum steady.",
  happy: "Your body may enjoy colorful antioxidants, protein, and healthy fats that match the upbeat mood.",
  sad: "Your body may respond well to warm comfort with protein, slow carbohydrates, and mineral-rich ingredients.",
  stressed: "Your body may be asking for satisfying crunch, protein, magnesium-rich ingredients, and hydration.",
  relaxed: "Your body can enjoy variety: fiber, vegetables, balanced fats, and a slower meal rhythm.",
  balanced: "Your body may simply need a complete plate: fiber, lean protein, vegetables, and hydration."
};

const localNutritionFocus = {
  lazy: ["complex carbohydrates", "protein", "hydration"],
  energetic: ["quality carbohydrates", "lean protein", "electrolytes"],
  happy: ["protein", "healthy fats", "antioxidants"],
  sad: ["protein", "slow carbohydrates", "magnesium"],
  stressed: ["protein", "magnesium", "hydration"],
  relaxed: ["omega-3 fats", "fiber", "micronutrients"],
  balanced: ["fiber", "lean protein", "micronutrients"]
};

const localNutritionReason = {
  lazy: "Supports steady energy with low effort.",
  energetic: "Adds fuel and protein for active energy.",
  happy: "Brings color, freshness, and satisfying protein.",
  sad: "Keeps comfort warm while adding substance.",
  stressed: "Balances cravings with protein and hydration support.",
  relaxed: "Fits a slower meal with variety and texture.",
  balanced: "Covers a steady mix of fiber, protein, and vegetables."
};

function DishImage({ image, icon, accent, name, size }: { image?: string; icon?: string; accent: string; name: string; size: number }) {
  const source = icon && dishAssets[icon] ? dishAssets[icon] : image ? { uri: image } : undefined;
  return (
    <ImageBackground
      source={source}
      style={[dishStyles.image, { width: size, height: size, borderRadius: Math.min(18, size / 4), backgroundColor: accent }]}
      imageStyle={{ borderRadius: Math.min(18, size / 4) }}
    >
      <LinearGradient colors={["rgba(0,0,0,0.04)", "rgba(0,0,0,0.45)"]} style={dishStyles.overlay}>
        <Text numberOfLines={1} style={dishStyles.caption}>{name.split(" ")[0]}</Text>
      </LinearGradient>
    </ImageBackground>
  );
}

function ComboPanel({
  drink,
  onAdd,
  onDismiss,
  styles,
  palette
}: {
  drink: MenuItem;
  onAdd: () => void;
  onDismiss: () => void;
  styles: ReturnType<typeof createStyles>;
  palette: (typeof themes)[ThemeId];
}) {
  return (
    <View style={styles.comboPanel}>
      <DishImage image={drink.image} icon={drink.icon} accent={drink.accent} name={drink.name} size={54} />
      <View style={styles.comboText}>
        <Text style={styles.comboTitle}>Make it a combo</Text>
        <Text style={styles.muted}>Pair your food with {drink.name}</Text>
      </View>
      <Pressable onPress={onAdd} style={styles.comboButton}>
        <Ionicons name="add" size={16} color={palette.surface} />
        <Text style={styles.comboButtonText}>{formatMoney(drink.price)}</Text>
      </Pressable>
      <Pressable onPress={onDismiss} style={styles.comboDismiss} hitSlop={10}>
        <Ionicons name="close" size={16} color={palette.muted} />
      </Pressable>
    </View>
  );
}

function ThemeSheet({
  activeThemeId,
  onSelect,
  onClose,
  styles
}: {
  activeThemeId: ThemeId;
  onSelect: (theme: ThemeId) => void;
  onClose: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.cartOverlay}>
      <Pressable style={styles.cartScrim} onPress={onClose} />
      <View style={styles.themeSheet}>
        <View style={styles.checkoutGrabber} />
        <View style={styles.checkoutHeader}>
          <View>
            <Text style={styles.checkoutTitle}>Choose Theme</Text>
            <Text style={styles.muted}>Earth Bistro stays the premium default</Text>
          </View>
          <Pressable onPress={onClose} style={styles.iconButton}>
            <Ionicons name="close" size={18} color={themes[activeThemeId].text} />
          </Pressable>
        </View>
        <View style={styles.themeOptions}>
          {(Object.keys(themes) as ThemeId[]).map((themeKey) => {
            const theme = themes[themeKey];
            const isActive = activeThemeId === themeKey;
            return (
              <Pressable
                key={theme.id}
                onPress={() => onSelect(themeKey)}
                style={[styles.themeOption, isActive && styles.activeThemeOption]}
              >
                <View style={styles.themeSwatches}>
                  <View style={[styles.themeSwatch, { backgroundColor: theme.primary }]} />
                  <View style={[styles.themeSwatch, { backgroundColor: theme.secondary }]} />
                  <View style={[styles.themeSwatch, { backgroundColor: theme.accent }]} />
                </View>
                <View style={styles.themeOptionText}>
                  <Text style={styles.cartItemName}>{theme.name}</Text>
                  <Text style={styles.muted}>{theme.caption}</Text>
                </View>
                {isActive ? <Ionicons name="checkmark-circle" size={22} color={theme.secondary} /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function ApiStatusPill({
  status,
  label,
  styles,
  palette
}: {
  status: ApiStatus;
  label: string;
  styles: ReturnType<typeof createStyles>;
  palette: (typeof themes)[ThemeId];
}) {
  const icon =
    status === "online" ? "radio-button-on" : status === "offline" ? "cloud-offline-outline" : "sync";
  return (
    <View style={[styles.apiPill, status === "offline" && styles.apiPillOffline]}>
      <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={13} color={status === "offline" ? palette.danger : palette.secondary} />
      <Text numberOfLines={1} style={[styles.apiPillText, status === "offline" && styles.apiPillTextOffline]}>
        {label}
      </Text>
    </View>
  );
}

function BillRow({
  label,
  value,
  strong,
  styles
}: {
  label: string;
  value: string;
  strong?: boolean;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.billRow}>
      <Text style={[styles.billLabel, strong && styles.billStrong]}>{label}</Text>
      <Text style={[styles.billValue, strong && styles.billStrong]}>{value}</Text>
    </View>
  );
}

function localAssistant(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("clear")) return { reply: "I cleared the cart.", actions: [{ type: "clear_cart" as const }] };
  const actions = menu
    .filter((item) => lower.includes(item.shortName.toLowerCase()) || lower.includes(item.name.toLowerCase()) || lower.includes(item.id.split("-")[0]))
    .map((item) => ({
      type: lower.includes("remove") ? ("remove_item" as const) : ("add_item" as const),
      itemId: item.id,
      quantity: lower.includes("two") ? 2 : 1
    }));
  return {
    reply: actions.length ? "Done. I updated the cart." : "I could not match that to a menu item yet.",
    actions
  };
}

function formatOfflineReason(error: unknown) {
  if (error instanceof ApiError && error.status) {
    return `I switched to the on-device parser because the API returned ${error.status}.`;
  }

  return `I switched to the on-device parser because I could not reach ${apiUrl}.`;
}

const dishStyles = StyleSheet.create({
  image: {
    width: 72,
    overflow: "hidden",
    shadowColor: "#1F2933",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 7
  },
  caption: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900"
  }
});

function createStyles(palette: (typeof themes)[ThemeId]) {
  return StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.background
  },
  screen: {
    flex: 1
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 18,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  headerActions: {
    alignItems: "flex-end",
    gap: 8
  },
  headerButtonRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  kicker: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0
  },
  title: {
    color: palette.text,
    fontSize: 30,
    fontWeight: "800",
    marginTop: 3
  },
  cartPill: {
    minWidth: 54,
    height: 38,
    borderRadius: 19,
    paddingHorizontal: 12,
    backgroundColor: palette.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    shadowColor: palette.text,
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 }
  },
  cartPillText: {
    fontWeight: "800",
    color: palette.text
  },
  iconPill: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: palette.surface,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: palette.text,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 }
  },
  apiPill: {
    maxWidth: 142,
    minHeight: 28,
    borderRadius: 14,
    paddingHorizontal: 10,
    backgroundColor: "rgba(255,255,255,0.86)",
    borderWidth: 1,
    borderColor: "rgba(46,196,182,0.26)",
    flexDirection: "row",
    alignItems: "center",
    gap: 5
  },
  apiPillOffline: {
    backgroundColor: palette.softOrange,
    borderColor: palette.primary
  },
  apiPillText: {
    color: palette.secondary,
    fontSize: 11,
    fontWeight: "800"
  },
  apiPillTextOffline: {
    color: palette.danger
  },
  heroCard: {
    marginTop: 18,
    padding: 16,
    borderRadius: 8,
    backgroundColor: palette.secondary,
    flexDirection: "row",
    alignItems: "center",
    gap: 14
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  heroCopy: {
    flex: 1
  },
  heroTitle: {
    color: palette.surface,
    fontSize: 17,
    fontWeight: "800"
  },
  heroText: {
    color: "#EFFFFC",
    marginTop: 3,
    lineHeight: 19
  },
  content: {
    flex: 1
  },
  contentInner: {
    padding: 20,
    paddingBottom: 118
  },
  orderSuccess: {
    minHeight: 72,
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.secondary,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: palette.text,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 }
  },
  successIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: palette.secondary,
    alignItems: "center",
    justifyContent: "center"
  },
  orderSuccessText: {
    flex: 1
  },
  orderSuccessTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 3
  },
  sectionHeader: {
    marginTop: 8,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  expandHeader: {
    marginTop: 8,
    marginBottom: 12,
    minHeight: 54,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  expandButton: {
    height: 34,
    borderRadius: 17,
    paddingHorizontal: 11,
    backgroundColor: palette.softTeal,
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  expandButtonText: {
    color: palette.secondary,
    fontWeight: "900",
    fontSize: 12
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: palette.text
  },
  muted: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18
  },
  moodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14
  },
  moodCard: {
    width: "31.5%",
    minHeight: 112,
    borderRadius: 8,
    padding: 10,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    justifyContent: "space-between"
  },
  activeMoodCard: {
    borderColor: palette.primary,
    backgroundColor: palette.softOrange
  },
  moodIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: palette.softTeal,
    alignItems: "center",
    justifyContent: "center"
  },
  moodLabel: {
    color: palette.text,
    fontWeight: "900",
    marginTop: 8
  },
  moodPrompt: {
    color: palette.muted,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 3
  },
  recommendationPanel: {
    borderRadius: 8,
    backgroundColor: palette.secondary,
    padding: 14,
    marginBottom: 18,
    gap: 10
  },
  recommendationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  recommendationTitle: {
    color: palette.surface,
    fontSize: 19,
    fontWeight: "900"
  },
  moodQuoteBox: {
    borderRadius: 8,
    backgroundColor: palette.softOrange,
    borderWidth: 1,
    borderColor: palette.accent,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  moodQuoteText: {
    color: palette.danger,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 20
  },
  nutritionBox: {
    borderRadius: 8,
    backgroundColor: palette.softTeal,
    borderWidth: 1,
    borderColor: palette.secondary,
    padding: 12,
    gap: 8
  },
  nutritionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  nutritionTitle: {
    color: palette.secondary,
    fontSize: 13,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0
  },
  nutritionCopy: {
    color: palette.text,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 19
  },
  nutritionChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7
  },
  nutritionChip: {
    borderRadius: 14,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  nutritionChipText: {
    color: palette.secondary,
    fontSize: 12,
    fontWeight: "800"
  },
  recommendationButton: {
    minHeight: 38,
    borderRadius: 19,
    paddingHorizontal: 13,
    backgroundColor: palette.primary,
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  recommendationButtonText: {
    color: palette.surface,
    fontWeight: "900"
  },
  recommendationLine: {
    minHeight: 64,
    borderRadius: 8,
    padding: 11,
    backgroundColor: palette.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  recommendationText: {
    flex: 1
  },
  cartOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    zIndex: 20
  },
  cartScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(31,41,51,0.38)"
  },
  checkoutSheet: {
    maxHeight: "82%",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: palette.surface,
    padding: 18,
    paddingBottom: 24,
    gap: 12,
    shadowColor: palette.text,
    shadowOpacity: 0.22,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: -8 }
  },
  themeSheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: palette.surface,
    padding: 18,
    paddingBottom: 24,
    gap: 14,
    shadowColor: palette.text,
    shadowOpacity: 0.22,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: -8 }
  },
  themeOptions: {
    gap: 10
  },
  themeOption: {
    minHeight: 72,
    borderRadius: 8,
    padding: 12,
    backgroundColor: palette.background,
    borderWidth: 1,
    borderColor: palette.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  activeThemeOption: {
    borderColor: palette.primary,
    backgroundColor: palette.softOrange
  },
  themeSwatches: {
    flexDirection: "row",
    width: 58
  },
  themeSwatch: {
    width: 22,
    height: 38,
    borderRadius: 11,
    marginRight: -4,
    borderWidth: 2,
    borderColor: palette.surface
  },
  themeOptionText: {
    flex: 1
  },
  checkoutGrabber: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: palette.border
  },
  checkoutHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  checkoutTitle: {
    color: palette.text,
    fontSize: 20,
    fontWeight: "900"
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: palette.softYellow,
    alignItems: "center",
    justifyContent: "center"
  },
  emptyCheckout: {
    minHeight: 110,
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  checkoutLine: {
    minHeight: 70,
    borderRadius: 8,
    backgroundColor: palette.softYellow,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  checkoutControls: {
    alignItems: "flex-end",
    gap: 8
  },
  checkoutList: {
    maxHeight: 260
  },
  billBox: {
    borderTopWidth: 1,
    borderTopColor: palette.border,
    paddingTop: 10,
    gap: 8
  },
  billRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  billLabel: {
    color: palette.muted,
    fontWeight: "700"
  },
  billValue: {
    color: palette.text,
    fontWeight: "800"
  },
  billStrong: {
    color: palette.text,
    fontSize: 17,
    fontWeight: "900"
  },
  checkoutButton: {
    minHeight: 48,
    borderRadius: 24,
    backgroundColor: palette.secondary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  checkoutButtonText: {
    color: palette.surface,
    fontWeight: "900",
    fontSize: 15
  },
  comboPanel: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    zIndex: 12,
    borderRadius: 8,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: palette.text,
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6
  },
  comboText: {
    flex: 1
  },
  comboTitle: {
    color: palette.text,
    fontWeight: "900",
    fontSize: 16,
    marginBottom: 3
  },
  comboButton: {
    minHeight: 38,
    borderRadius: 19,
    paddingHorizontal: 12,
    backgroundColor: palette.primary,
    flexDirection: "row",
    alignItems: "center",
    gap: 5
  },
  comboButtonText: {
    color: palette.surface,
    fontWeight: "900"
  },
  comboDismiss: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: palette.softYellow,
    alignItems: "center",
    justifyContent: "center"
  },
  tabs: {
    marginBottom: 14
  },
  tab: {
    paddingHorizontal: 16,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.border,
    justifyContent: "center",
    marginRight: 8,
    backgroundColor: palette.surface
  },
  activeTab: {
    backgroundColor: palette.secondary,
    borderColor: palette.secondary
  },
  tabText: {
    color: palette.secondary,
    fontWeight: "700"
  },
  activeTabText: {
    color: palette.surface
  },
  menuGrid: {
    gap: 12
  },
  menuCard: {
    minHeight: 122,
    borderRadius: 8,
    padding: 14,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    flexDirection: "row",
    gap: 13,
    shadowColor: palette.text,
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 }
  },
  dishImage: {
    width: 72,
    overflow: "hidden",
    shadowColor: palette.text,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }
  },
  dishOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 7
  },
  dishCaption: {
    color: palette.surface,
    fontSize: 10,
    fontWeight: "900"
  },
  menuInfo: {
    flex: 1
  },
  itemName: {
    fontSize: 17,
    color: palette.text,
    fontWeight: "800"
  },
  tags: {
    color: palette.muted,
    marginTop: 5,
    lineHeight: 18
  },
  cardFooter: {
    marginTop: "auto",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  price: {
    color: palette.text,
    fontWeight: "900",
    fontSize: 16
  },
  addButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: palette.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  cartPanel: {
    borderRadius: 8,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    overflow: "hidden"
  },
  emptyCart: {
    minHeight: 88,
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  emptyText: {
    color: palette.muted,
    fontWeight: "600"
  },
  cartLine: {
    minHeight: 70,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  cartLineText: {
    flex: 1
  },
  cartItemName: {
    color: palette.text,
    fontWeight: "800",
    marginBottom: 3
  },
  quantityStepper: {
    height: 36,
    borderRadius: 18,
    backgroundColor: palette.softYellow,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 5,
    gap: 8
  },
  stepButton: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: palette.surface,
    alignItems: "center",
    justifyContent: "center"
  },
  quantity: {
    minWidth: 18,
    textAlign: "center",
    fontWeight: "900",
    color: palette.text
  },
  assistantPanel: {
    marginTop: 0,
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
    gap: 12
  },
  assistantHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  bubble: {
    maxWidth: "88%",
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 8,
    marginVertical: 4
  },
  assistantBubble: {
    alignSelf: "flex-start",
    backgroundColor: palette.softYellow
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: palette.secondary
  },
  bubbleText: {
    color: palette.text,
    lineHeight: 19
  },
  userBubbleText: {
    color: palette.surface
  },
  promptChip: {
    height: 32,
    borderRadius: 16,
    paddingHorizontal: 12,
    backgroundColor: palette.softTeal,
    justifyContent: "center"
  },
  promptText: {
    color: palette.secondary,
    fontWeight: "700",
    fontSize: 12
  },
  composer: {
    minHeight: 50,
    borderRadius: 25,
    backgroundColor: palette.softYellow,
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 16,
    paddingRight: 6
  },
  input: {
    flex: 1,
    color: palette.text,
    fontSize: 15,
    paddingVertical: 10
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: palette.primary,
    alignItems: "center",
    justifyContent: "center"
  }
  });
}



