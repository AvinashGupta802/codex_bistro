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
import { CartAction, CartLine, ChatMessage, MenuItem, MoodResult } from "./src/types";

const starterMessages: ChatMessage[] = [
  {
    id: "intro",
    role: "assistant",
    text: "Welcome in. What kind of meal are you in the mood for today?"
  }
];

type ApiStatus = "checking" | "online" | "offline";

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
      const fallback = localMood(label);
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
      const fallback = localAssistant(trimmed);
      setApiStatus("offline");
      setApiStatusText("Offline mode");
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={styles.screen}
      >
        <LinearGradient colors={["#FFF9F0", "#F5F7F1"]} style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.kicker}>AI mood-led ordering</Text>
              <Text style={styles.title}>Intelligent Bistro</Text>
            </View>
            <View style={styles.headerActions}>
              <ApiStatusPill status={apiStatus} label={apiStatusText} />
              <Pressable
                style={styles.cartPill}
                onPress={() => setIsCartOpen(true)}
                hitSlop={10}
              >
                <Ionicons name="bag-handle-outline" size={18} color="#162016" />
                <Text style={styles.cartPillText}>{itemCount}</Text>
              </Pressable>
            </View>
          </View>
          <Pressable style={styles.heroCard} onPress={() => setIsMoodGuideOpen((open) => !open)}>
            <View style={styles.heroIcon}>
              <Ionicons name="sparkles" size={22} color="#FFFFFF" />
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.heroTitle}>Tell me your mood.</Text>
              <Text style={styles.heroText}>Type naturally, or tap to explore the 7 mood categories.</Text>
            </View>
            <Ionicons name={isMoodGuideOpen ? "chevron-up" : "chevron-down"} size={20} color="#FFFFFF" />
          </Pressable>
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
                <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              </View>
              <View style={styles.orderSuccessText}>
                <Text style={styles.orderSuccessTitle}>Order {lastOrder.id} confirmed</Text>
                <Text style={styles.muted}>
                  {formatMoney(lastOrder.total)} paid / pickup in {lastOrder.eta}
                </Text>
              </View>
            </View>
          ) : null}

          <Pressable style={styles.expandHeader} onPress={() => setIsMoodGuideOpen((open) => !open)}>
            <View>
              <Text style={styles.sectionTitle}>Mood Match</Text>
              <Text style={styles.muted}>Write your mood first; examples are optional</Text>
            </View>
            <View style={styles.expandButton}>
              <Text style={styles.expandButtonText}>{isMoodGuideOpen ? "Hide" : "Show"}</Text>
              <Ionicons name={isMoodGuideOpen ? "chevron-up" : "chevron-down"} size={16} color="#344E41" />
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
                    <Ionicons name={mood.icon as keyof typeof Ionicons.glyphMap} size={18} color="#344E41" />
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
                  <Ionicons name="bag-add-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.recommendationButtonText}>Add meal</Text>
                </Pressable>
              </View>
              {selectedMood.highlight ? (
                <View style={styles.moodQuoteBox}>
                  <Text style={styles.moodQuoteText}>{selectedMood.highlight}</Text>
                </View>
              ) : null}
              {selectedMood.recommendations.map((item) => (
                <View key={item.itemId} style={styles.recommendationLine}>
                  <DishImage image={item.image} icon={item.icon} accent={item.accent ?? "#E4572E"} name={item.name} size={58} />
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
                      <Ionicons name="add" size={18} color="#FFFFFF" />
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
                <Ionicons name="receipt-outline" size={26} color="#84907C" />
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
                      <Ionicons name="remove" size={15} color="#162016" />
                    </Pressable>
                    <Text style={styles.quantity}>{line.quantity}</Text>
                    <Pressable onPress={() => changeQuantity(line, 1)} style={styles.stepButton}>
                      <Ionicons name="add" size={15} color="#162016" />
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </View>

          <View style={styles.assistantPanel}>
            <View style={styles.assistantHeader}>
              <View>
                <Text style={styles.sectionTitle}>Bistro Assistant</Text>
                <Text style={styles.muted}>Mood discovery and cart control</Text>
              </View>
              {isSending ? (
                <ActivityIndicator color="#E4572E" />
              ) : (
                <Ionicons name="chatbubble-ellipses-outline" size={23} color="#344E41" />
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

            {selectedMood ? (
              <View style={styles.chatSuggestions}>
                <View style={styles.chatSuggestionsHeader}>
                  <Text style={styles.chatSuggestionsTitle}>Suggested for {selectedMood.label}</Text>
                  <Pressable
                    onPress={() => addRecommendation(selectedMood.actions, selectedMood.label.toLowerCase())}
                    style={styles.chatAddButton}
                  >
                    <Ionicons name="bag-add-outline" size={14} color="#FFFFFF" />
                    <Text style={styles.chatAddButtonText}>Add top picks</Text>
                  </Pressable>
                </View>
                {selectedMood.highlight ? (
                  <Text style={styles.chatMoodQuote}>{selectedMood.highlight}</Text>
                ) : null}
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {selectedMood.recommendations.map((item) => (
                    <Pressable
                      key={item.itemId}
                      onPress={() =>
                        addItem(menu.find((entry) => entry.id === item.itemId)!)
                      }
                      style={styles.suggestionCard}
                    >
                      <DishImage image={item.image} icon={item.icon} accent={item.accent ?? "#E4572E"} name={item.name} size={116} />
                      <Text numberOfLines={2} style={styles.suggestionName}>{item.name}</Text>
                      <Text style={styles.suggestionPrice}>{formatMoney(item.price)}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            <View style={styles.composer}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Tell me your mood or what to order"
                placeholderTextColor="#8E9587"
                style={styles.input}
                returnKeyType="send"
                onSubmitEditing={() => submitMessage()}
              />
              <Pressable onPress={() => submitMessage()} style={styles.sendButton}>
                <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
              </Pressable>
            </View>
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
                  <Ionicons name="close" size={18} color="#162016" />
                </Pressable>
              </View>
              {cart.length === 0 ? (
                <View style={styles.emptyCheckout}>
                  <Ionicons name="bag-outline" size={26} color="#84907C" />
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
                              <Ionicons name={line.quantity === 1 ? "trash-outline" : "remove"} size={15} color="#162016" />
                            </Pressable>
                            <Text style={styles.quantity}>{line.quantity}</Text>
                            <Pressable
                              onPress={() => changeQuantity(line, 1)}
                              style={styles.stepButton}
                              accessibilityLabel={`Add one ${line.name}`}
                            >
                              <Ionicons name="add" size={15} color="#162016" />
                            </Pressable>
                          </View>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                  <View style={styles.billBox}>
                    <BillRow label="Subtotal" value={formatMoney(subtotal)} />
                    <BillRow label="Service" value={formatMoney(serviceFee)} />
                    <BillRow label="Total" value={formatMoney(total)} strong />
                  </View>
                  <Pressable onPress={confirmOrder} style={styles.checkoutButton}>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
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
    "neutral",
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

function localMood(label: string): MoodResult {
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
              : mood.id === "neutral"
                ? ["spicy-chicken", "truffle-burger", "rainbow-sushi"]
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
      reason: `A strong match for a ${mood.label.toLowerCase()} mood.`
    };
  });
  return {
    mood: mood.id,
    label: mood.label,
    confidence: 0.7,
    highlight: localMoodHighlight[mood.id],
    reply: `${mood.label} sounds right. ${localMoodHighlight[mood.id]} I would suggest ${recommendations.map((item) => item.name).join(", ")}.`,
    recommendations,
    actions: itemIds.map((itemId) => ({ type: "add_item", itemId, quantity: 1 }))
  };
}

const localMoodHighlight = {
  lazy: "We will even save your walk to your refrigerator. Grab from below",
  energetic: "Food is fuel. Grab from below",
  stressed: "Stressed is nothing but desserts spelled in the wrong way. Grab from below",
  relaxed: "Good food adds to your relaxation. Grab from below",
  sad: "No man is lonely while eating spaghetti. Grab from below",
  happy: "Laughter is brightest in the place where food is. Grab from below",
  neutral: "Our food will be very close to your mother's cooking. Grab from below"
};

function DishImage({ image, icon, accent, name, size }: { image?: string; icon?: string; accent: string; name: string; size: number }) {
  const source = icon && dishAssets[icon] ? dishAssets[icon] : image ? { uri: image } : undefined;
  return (
    <ImageBackground
      source={source}
      style={[styles.dishImage, { width: size, height: size, borderRadius: Math.min(18, size / 4), backgroundColor: accent }]}
      imageStyle={{ borderRadius: Math.min(18, size / 4) }}
    >
      <LinearGradient colors={["rgba(0,0,0,0.04)", "rgba(0,0,0,0.45)"]} style={styles.dishOverlay}>
        <Text numberOfLines={1} style={styles.dishCaption}>{name.split(" ")[0]}</Text>
      </LinearGradient>
    </ImageBackground>
  );
}

function ComboPanel({
  drink,
  onAdd,
  onDismiss
}: {
  drink: MenuItem;
  onAdd: () => void;
  onDismiss: () => void;
}) {
  return (
    <View style={styles.comboPanel}>
      <DishImage image={drink.image} icon={drink.icon} accent={drink.accent} name={drink.name} size={54} />
      <View style={styles.comboText}>
        <Text style={styles.comboTitle}>Make it a combo</Text>
        <Text style={styles.muted}>Pair your food with {drink.name}</Text>
      </View>
      <Pressable onPress={onAdd} style={styles.comboButton}>
        <Ionicons name="add" size={16} color="#FFFFFF" />
        <Text style={styles.comboButtonText}>{formatMoney(drink.price)}</Text>
      </Pressable>
      <Pressable onPress={onDismiss} style={styles.comboDismiss} hitSlop={10}>
        <Ionicons name="close" size={16} color="#6B705C" />
      </Pressable>
    </View>
  );
}

function ApiStatusPill({ status, label }: { status: ApiStatus; label: string }) {
  const icon =
    status === "online" ? "radio-button-on" : status === "offline" ? "cloud-offline-outline" : "sync";
  return (
    <View style={[styles.apiPill, status === "offline" && styles.apiPillOffline]}>
      <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={13} color={status === "offline" ? "#8A1C1C" : "#344E41"} />
      <Text numberOfLines={1} style={[styles.apiPillText, status === "offline" && styles.apiPillTextOffline]}>
        {label}
      </Text>
    </View>
  );
}

function BillRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFF9F0"
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
  kicker: {
    color: "#6B705C",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0
  },
  title: {
    color: "#162016",
    fontSize: 30,
    fontWeight: "800",
    marginTop: 3
  },
  cartPill: {
    minWidth: 54,
    height: 38,
    borderRadius: 19,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    shadowColor: "#243124",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 }
  },
  cartPillText: {
    fontWeight: "800",
    color: "#162016"
  },
  apiPill: {
    maxWidth: 142,
    minHeight: 28,
    borderRadius: 14,
    paddingHorizontal: 10,
    backgroundColor: "rgba(255,255,255,0.78)",
    borderWidth: 1,
    borderColor: "rgba(52,78,65,0.14)",
    flexDirection: "row",
    alignItems: "center",
    gap: 5
  },
  apiPillOffline: {
    backgroundColor: "#FFF1EE",
    borderColor: "#F1B8A8"
  },
  apiPillText: {
    color: "#344E41",
    fontSize: 11,
    fontWeight: "800"
  },
  apiPillTextOffline: {
    color: "#8A1C1C"
  },
  heroCard: {
    marginTop: 18,
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#162016",
    flexDirection: "row",
    alignItems: "center",
    gap: 14
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E4572E",
    alignItems: "center",
    justifyContent: "center"
  },
  heroCopy: {
    flex: 1
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "800"
  },
  heroText: {
    color: "#DCE5D7",
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
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CFE5D5",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#243124",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 }
  },
  successIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#344E41",
    alignItems: "center",
    justifyContent: "center"
  },
  orderSuccessText: {
    flex: 1
  },
  orderSuccessTitle: {
    color: "#162016",
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
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7E1D5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  expandButton: {
    height: 34,
    borderRadius: 17,
    paddingHorizontal: 11,
    backgroundColor: "#ECF2E8",
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  expandButtonText: {
    color: "#344E41",
    fontWeight: "900",
    fontSize: 12
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#162016"
  },
  muted: {
    color: "#6B705C",
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
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7E1D5",
    justifyContent: "space-between"
  },
  activeMoodCard: {
    borderColor: "#E4572E",
    backgroundColor: "#FFF3EA"
  },
  moodIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#ECF2E8",
    alignItems: "center",
    justifyContent: "center"
  },
  moodLabel: {
    color: "#162016",
    fontWeight: "900",
    marginTop: 8
  },
  moodPrompt: {
    color: "#6B705C",
    fontSize: 11,
    lineHeight: 15,
    marginTop: 3
  },
  recommendationPanel: {
    borderRadius: 8,
    backgroundColor: "#162016",
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
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "900"
  },
  moodQuoteBox: {
    borderRadius: 8,
    backgroundColor: "#FFF3EA",
    borderWidth: 1,
    borderColor: "#F4A261",
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  moodQuoteText: {
    color: "#7A2E18",
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 20
  },
  recommendationButton: {
    minHeight: 38,
    borderRadius: 19,
    paddingHorizontal: 13,
    backgroundColor: "#E4572E",
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  recommendationButtonText: {
    color: "#FFFFFF",
    fontWeight: "900"
  },
  recommendationLine: {
    minHeight: 64,
    borderRadius: 8,
    padding: 11,
    backgroundColor: "#FFFFFF",
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
    backgroundColor: "rgba(22,32,22,0.34)"
  },
  checkoutSheet: {
    maxHeight: "82%",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: "#FFFFFF",
    padding: 18,
    paddingBottom: 24,
    gap: 12,
    shadowColor: "#283618",
    shadowOpacity: 0.22,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: -8 }
  },
  checkoutGrabber: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#DAD7CD"
  },
  checkoutHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  checkoutTitle: {
    color: "#162016",
    fontSize: 20,
    fontWeight: "900"
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F4F0E8",
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
    backgroundColor: "#F8F5EF",
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
    borderTopColor: "#E7E1D5",
    paddingTop: 10,
    gap: 8
  },
  billRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  billLabel: {
    color: "#6B705C",
    fontWeight: "700"
  },
  billValue: {
    color: "#162016",
    fontWeight: "800"
  },
  billStrong: {
    color: "#162016",
    fontSize: 17,
    fontWeight: "900"
  },
  checkoutButton: {
    minHeight: 48,
    borderRadius: 24,
    backgroundColor: "#344E41",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  checkoutButtonText: {
    color: "#FFFFFF",
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
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7E1D5",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#283618",
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6
  },
  comboText: {
    flex: 1
  },
  comboTitle: {
    color: "#162016",
    fontWeight: "900",
    fontSize: 16,
    marginBottom: 3
  },
  comboButton: {
    minHeight: 38,
    borderRadius: 19,
    paddingHorizontal: 12,
    backgroundColor: "#E4572E",
    flexDirection: "row",
    alignItems: "center",
    gap: 5
  },
  comboButtonText: {
    color: "#FFFFFF",
    fontWeight: "900"
  },
  comboDismiss: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F5F1E8",
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
    borderColor: "#DAD7CD",
    justifyContent: "center",
    marginRight: 8,
    backgroundColor: "#FFFFFF"
  },
  activeTab: {
    backgroundColor: "#344E41",
    borderColor: "#344E41"
  },
  tabText: {
    color: "#344E41",
    fontWeight: "700"
  },
  activeTabText: {
    color: "#FFFFFF"
  },
  menuGrid: {
    gap: 12
  },
  menuCard: {
    minHeight: 122,
    borderRadius: 8,
    padding: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7E1D5",
    flexDirection: "row",
    gap: 13,
    shadowColor: "#283618",
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 }
  },
  dishImage: {
    width: 72,
    overflow: "hidden",
    shadowColor: "#1E251D",
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
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900"
  },
  menuInfo: {
    flex: 1
  },
  itemName: {
    fontSize: 17,
    color: "#162016",
    fontWeight: "800"
  },
  tags: {
    color: "#6B705C",
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
    color: "#162016",
    fontWeight: "900",
    fontSize: 16
  },
  addButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#E4572E",
    alignItems: "center",
    justifyContent: "center"
  },
  cartPanel: {
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7E1D5",
    overflow: "hidden"
  },
  emptyCart: {
    minHeight: 88,
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  emptyText: {
    color: "#6B705C",
    fontWeight: "600"
  },
  cartLine: {
    minHeight: 70,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0ECE4",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  cartLineText: {
    flex: 1
  },
  cartItemName: {
    color: "#162016",
    fontWeight: "800",
    marginBottom: 3
  },
  quantityStepper: {
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F4F0E8",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 5,
    gap: 8
  },
  stepButton: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center"
  },
  quantity: {
    minWidth: 18,
    textAlign: "center",
    fontWeight: "900",
    color: "#162016"
  },
  assistantPanel: {
    marginTop: 20,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7E1D5",
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
    backgroundColor: "#F4F0E8"
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#344E41"
  },
  bubbleText: {
    color: "#2E332C",
    lineHeight: 19
  },
  userBubbleText: {
    color: "#FFFFFF"
  },
  quickPrompts: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  chatSuggestions: {
    borderRadius: 8,
    backgroundColor: "#FFF8EE",
    borderWidth: 1,
    borderColor: "#E7E1D5",
    padding: 12,
    gap: 10
  },
  chatSuggestionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  chatSuggestionsTitle: {
    color: "#162016",
    fontWeight: "900",
    fontSize: 15
  },
  chatMoodQuote: {
    color: "#7A2E18",
    backgroundColor: "#FFF3EA",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontWeight: "900",
    lineHeight: 18
  },
  chatAddButton: {
    minHeight: 32,
    borderRadius: 16,
    backgroundColor: "#E4572E",
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 5
  },
  chatAddButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 12
  },
  suggestionCard: {
    width: 132,
    marginRight: 10,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7E1D5",
    padding: 8,
    gap: 7
  },
  suggestionName: {
    color: "#162016",
    fontWeight: "900",
    minHeight: 36,
    lineHeight: 18
  },
  suggestionPrice: {
    color: "#E4572E",
    fontWeight: "900"
  },
  promptChip: {
    height: 32,
    borderRadius: 16,
    paddingHorizontal: 12,
    backgroundColor: "#ECF2E8",
    justifyContent: "center"
  },
  promptText: {
    color: "#344E41",
    fontWeight: "700",
    fontSize: 12
  },
  composer: {
    minHeight: 50,
    borderRadius: 25,
    backgroundColor: "#F4F0E8",
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 16,
    paddingRight: 6
  },
  input: {
    flex: 1,
    color: "#162016",
    fontSize: 15,
    paddingVertical: 10
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E4572E",
    alignItems: "center",
    justifyContent: "center"
  }
});
