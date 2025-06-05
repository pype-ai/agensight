import sys
import os
# Add the parent directory to Python path so it can find the agensight package
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

import json
from datetime import datetime, timedelta
from typing import Annotated, Sequence, TypedDict, Dict, Any, List
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode
from agensight import init, trace, span

# Initialize Agensight with prod mode and project ID
init(
    name="travel-assistant-pro",
    mode="prod",
    project_id="11369202-0801-471f-8d83-01d7b7709be2"
)

api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    print("Error: Please set the OPENAI_API_KEY environment variable.")
    exit(1)

class State(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]
    user_profile: Dict[str, Any]
    current_search_context: Dict[str, Any]
    booking_session: Dict[str, Any]

# ===================================
# TRAVEL DATABASE (REALISTIC DATA)
# ===================================
AIRLINES_DATABASE = {
    "AA": {"name": "American Airlines", "rating": 4.1, "baggage_fee": 30, "alliance": "OneWorld"},
    "DL": {"name": "Delta Air Lines", "rating": 4.3, "baggage_fee": 30, "alliance": "SkyTeam"},
    "UA": {"name": "United Airlines", "rating": 4.0, "baggage_fee": 35, "alliance": "Star Alliance"},
    "AF": {"name": "Air France", "rating": 4.2, "baggage_fee": 25, "alliance": "SkyTeam"},
    "BA": {"name": "British Airways", "rating": 4.4, "baggage_fee": 35, "alliance": "OneWorld"},
    "LH": {"name": "Lufthansa", "rating": 4.5, "baggage_fee": 30, "alliance": "Star Alliance"},
    "EK": {"name": "Emirates", "rating": 4.6, "baggage_fee": 0, "alliance": "Independent"},
    "SQ": {"name": "Singapore Airlines", "rating": 4.7, "baggage_fee": 0, "alliance": "Star Alliance"}
}

GLOBAL_AIRPORTS = {
    "NYC": {"airports": ["JFK", "LGA", "EWR"], "city": "New York", "timezone": "EST"},
    "LON": {"airports": ["LHR", "LGW", "STN"], "city": "London", "timezone": "GMT"}, 
    "PAR": {"airports": ["CDG", "ORY"], "city": "Paris", "timezone": "CET"},
    "TOK": {"airports": ["NRT", "HND"], "city": "Tokyo", "timezone": "JST"},
    "LAX": {"airports": ["LAX"], "city": "Los Angeles", "timezone": "PST"},
    "DXB": {"airports": ["DXB"], "city": "Dubai", "timezone": "GST"},
    "SIN": {"airports": ["SIN"], "city": "Singapore", "timezone": "SGT"},
    "HKG": {"airports": ["HKG"], "city": "Hong Kong", "timezone": "HKT"}
}

HOTEL_INVENTORY = [
    {"id": "LUX001", "city": "London", "name": "The Shard Hotel", "brand": "Shangri-La", 
     "category": "luxury", "price_range": [400, 1200], "rating": 4.8, 
     "amenities": ["spa", "infinity_pool", "michelin_restaurant", "business_center", "concierge"],
     "location": "London Bridge", "business_facilities": True},
    
    {"id": "BUS002", "city": "London", "name": "Hilton London Tower Bridge", "brand": "Hilton", 
     "category": "business", "price_range": [200, 450], "rating": 4.3,
     "amenities": ["gym", "business_center", "meeting_rooms", "wifi", "restaurant"],
     "location": "Tower Bridge", "business_facilities": True},
     
    {"id": "ECO003", "city": "London", "name": "Premier Inn London City", "brand": "Premier Inn", 
     "category": "economy", "price_range": [90, 180], "rating": 4.1,
     "amenities": ["wifi", "restaurant", "24h_front_desk"], 
     "location": "City", "business_facilities": False},

    {"id": "LUX004", "city": "Paris", "name": "Le Meurice", "brand": "Dorchester Collection", 
     "category": "luxury", "price_range": [600, 1500], "rating": 4.9,
     "amenities": ["spa", "michelin_restaurant", "butler_service", "fitness", "concierge"],
     "location": "Tuileries", "business_facilities": True},
     
    {"id": "BUS005", "city": "Paris", "name": "Pullman Paris Tour Eiffel", "brand": "Pullman", 
     "category": "business", "price_range": [250, 500], "rating": 4.4,
     "amenities": ["meeting_rooms", "business_center", "gym", "restaurant", "wifi"],
     "location": "Champ de Mars", "business_facilities": True},

    {"id": "LUX006", "city": "Tokyo", "name": "Park Hyatt Tokyo", "brand": "Hyatt", 
     "category": "luxury", "price_range": [500, 1500], "rating": 4.8,
     "amenities": ["spa", "pool", "michelin_restaurant", "fitness", "concierge"],
     "location": "Shinjuku", "business_facilities": True}
]

VEHICLE_FLEET = {
    "London": {
        "Hertz": {
            "economy": {"models": ["Ford Fiesta", "Vauxhall Corsa"], "daily_rate": 45},
            "compact": {"models": ["Volkswagen Golf", "Ford Focus"], "daily_rate": 65},
            "premium": {"models": ["BMW 3 Series", "Audi A4"], "daily_rate": 120},
            "luxury": {"models": ["BMW 5 Series", "Mercedes E-Class"], "daily_rate": 180}
        },
        "Avis": {
            "economy": {"models": ["Nissan Micra", "Peugeot 208"], "daily_rate": 42},
            "suv": {"models": ["Nissan Qashqai", "Ford Kuga"], "daily_rate": 85},
            "luxury": {"models": ["Jaguar XE", "Range Rover Evoque"], "daily_rate": 200}
        }
    },
    "Paris": {
        "Europcar": {
            "economy": {"models": ["Peugeot 208", "Renault Clio"], "daily_rate": 38},
            "compact": {"models": ["Peugeot 308", "Citroen C4"], "daily_rate": 55},
            "luxury": {"models": ["BMW 3 Series", "Mercedes C-Class"], "daily_rate": 140}
        }
    },
    "Tokyo": {
        "Toyota Rent a Car": {
            "compact": {"models": ["Toyota Yaris", "Honda Fit"], "daily_rate": 50},
            "hybrid": {"models": ["Toyota Prius", "Honda Insight"], "daily_rate": 65},
            "luxury": {"models": ["Lexus ES", "Toyota Crown"], "daily_rate": 110}
        }
    }
}


# TOOLS (Functions without @span)
@tool
def search_flights_inventory(origin: str, destination: str, departure_date: str, 
                           return_date: str = None, passengers: int = 1, 
                           cabin_class: str = "economy") -> str:
    """
    Search comprehensive flight inventory with real airline data.
    
    Args:
        origin: Origin city code (NYC, LON, PAR, etc.)
        destination: Destination city code  
        departure_date: Departure date (YYYY-MM-DD)
        return_date: Return date for round trip (optional)
        passengers: Number of passengers (default: 1)
        cabin_class: Cabin class (economy, business, first)
    """
    import random
    
    # Validate airports
    origin_data = GLOBAL_AIRPORTS.get(origin.upper())
    dest_data = GLOBAL_AIRPORTS.get(destination.upper())
    
    if not origin_data or not dest_data:
        return f"❌ Invalid route: {origin} to {destination}. Supported cities: {', '.join(GLOBAL_AIRPORTS.keys())}"
    
    # Generate realistic flight options
    flights = []
    available_airlines = list(AIRLINES_DATABASE.keys())
    
    for _ in range(random.randint(3, 6)):  # 3-6 flight options
        airline_code = random.choice(available_airlines)
        airline = AIRLINES_DATABASE[airline_code]
        
        # Route-based pricing logic
        base_price = random.randint(300, 800)
        if origin.upper() in ["NYC", "LAX"] and destination.upper() in ["LON", "PAR"]:
            base_price = random.randint(400, 1200)  # Transatlantic premium
        elif "TOK" in [origin.upper(), destination.upper()]:
            base_price = random.randint(600, 1500)  # Asia routes
            
        # Class multipliers
        if cabin_class == "business":
            base_price *= random.uniform(2.5, 3.5)
        elif cabin_class == "first":
            base_price *= random.uniform(4.0, 6.0)
            
        flight_option = {
            "airline": airline["name"],
            "flight_number": f"{airline_code}{random.randint(100, 999)}",
            "route": f"{random.choice(origin_data['airports'])} → {random.choice(dest_data['airports'])}",
            "departure": f"{random.randint(6, 23):02d}:{random.choice(['00', '15', '30', '45'])}",
            "arrival": f"{random.randint(6, 23):02d}:{random.choice(['00', '15', '30', '45'])}",
            "duration": f"{random.randint(1, 16)}h {random.randint(0, 59)}m",
            "stops": random.choices([0, 1, 2], weights=[70, 25, 5])[0],
            "price_per_pax": int(base_price),
            "total_price": int(base_price * passengers),
            "baggage_allowance": "23kg" if airline["baggage_fee"] == 0 else f"23kg (+${airline['baggage_fee']})",
            "alliance": airline["alliance"],
            "aircraft": random.choice(["Boeing 777", "Airbus A350", "Boeing 787", "Airbus A380"]),
            "rating": airline["rating"]
        }
        flights.append(flight_option)
    
    # Sort by price
    flights.sort(key=lambda x: x["price_per_pax"])
    
    # Format comprehensive results
    result = f"✈️ **FLIGHT SEARCH RESULTS**\n"
    result += f"📍 Route: {origin_data['city']} → {dest_data['city']}\n"
    result += f"📅 Date: {departure_date} | 👥 Passengers: {passengers} | 🎫 Class: {cabin_class.title()}\n\n"
    
    for i, flight in enumerate(flights, 1):
        stops_text = "Direct" if flight["stops"] == 0 else f"{flight['stops']} stop(s)"
        
        result += f"**{i}. {flight['airline']} {flight['flight_number']}** ⭐ {flight['rating']}/5\n"
        result += f"   🛫 {flight['route']} | ⏱️ {flight['duration']} ({stops_text})\n"
        result += f"   🕐 Departure: {flight['departure']} → Arrival: {flight['arrival']}\n"
        result += f"   ✈️ Aircraft: {flight['aircraft']} | 🌐 {flight['alliance']}\n"
        result += f"   💰 ${flight['price_per_pax']}/person (Total: ${flight['total_price']})\n"
        result += f"   🧳 Baggage: {flight['baggage_allowance']}\n\n"
    
    return result

@tool
def search_hotel_inventory(city: str, checkin_date: str, checkout_date: str, 
                          guests: int = 2, budget_max: int = 1000, 
                          category: str = "any") -> str:
    """
    Search premium hotel inventory with detailed amenities and business facilities.
    
    Args:
        city: City name (London, Paris, Tokyo, etc.)
        checkin_date: Check-in date (YYYY-MM-DD)
        checkout_date: Check-out date (YYYY-MM-DD)  
        guests: Number of guests
        budget_max: Maximum budget per night
        category: Hotel category (luxury, business, economy, any)
    """
    
    # Filter hotels by city
    city_hotels = [h for h in HOTEL_INVENTORY if city.lower() in h["city"].lower()]
    
    if not city_hotels:
        return f"❌ No hotels found in {city}. Available cities: London, Paris, Tokyo"
    
    # Apply filters
    if category != "any":
        city_hotels = [h for h in city_hotels if h["category"] == category.lower()]
    
    # Calculate stay duration
    from datetime import datetime
    checkin = datetime.strptime(checkin_date, "%Y-%m-%d")
    checkout = datetime.strptime(checkout_date, "%Y-%m-%d")
    nights = (checkout - checkin).days
    
    if nights <= 0:
        return "❌ Invalid dates: Check-out must be after check-in"
    
    # Generate availability and pricing
    import random
    available_hotels = []
    
    for hotel in city_hotels:
        # Dynamic pricing based on demand
        nightly_rate = random.randint(hotel["price_range"][0], hotel["price_range"][1])
        
        if nightly_rate <= budget_max:
            hotel_offer = hotel.copy()
            hotel_offer["current_rate"] = nightly_rate
            hotel_offer["total_cost"] = nightly_rate * nights
            hotel_offer["availability"] = random.choice(["Excellent", "Good", "Limited", "Last Rooms"])
            hotel_offer["booking_urgency"] = "High" if hotel_offer["availability"] == "Last Rooms" else "Normal"
            available_hotels.append(hotel_offer)
    
    if not available_hotels:
        return f"❌ No hotels in {city} within ${budget_max}/night budget for {category} category"
    
    # Sort by rating
    available_hotels.sort(key=lambda x: x["rating"], reverse=True)
    
    # Format luxury results
    result = f"🏨 **HOTEL SEARCH RESULTS**\n"
    result += f"📍 Location: {city} | 📅 {checkin_date} to {checkout_date} ({nights} nights)\n"
    result += f"👥 Guests: {guests} | 💰 Budget: Up to ${budget_max}/night\n\n"
    
    for i, hotel in enumerate(available_hotels, 1):
        amenities_preview = " | ".join(hotel["amenities"][:4])
        if len(hotel["amenities"]) > 4:
            amenities_preview += f" + {len(hotel['amenities']) - 4} more"
        
        business_indicator = "🏢 Business Facilities" if hotel["business_facilities"] else ""
        urgency_indicator = "🔥 Limited Availability" if hotel["booking_urgency"] == "High" else ""
        
        result += f"**{i}. {hotel['name']}** ({hotel['brand']}) ⭐ {hotel['rating']}/5\n"
        result += f"   📍 {hotel['location']}, {hotel['city']} | 🏷️ {hotel['category'].title()} Category\n"
        result += f"   💰 ${hotel['current_rate']}/night × {nights} nights = **${hotel['total_cost']} total**\n"
        result += f"   🎯 {amenities_preview}\n"
        result += f"   📊 Availability: {hotel['availability']} {business_indicator} {urgency_indicator}\n\n"
    
    return result


@tool
def search_vehicle_fleet(city: str, pickup_date: str, return_date: str, 
                        vehicle_category: str = "any") -> str:
    """
    Search premium vehicle rental fleet with detailed specifications.
    
    Args:
        city: City for rental (London, Paris, Tokyo)
        pickup_date: Pickup date (YYYY-MM-DD)
        return_date: Return date (YYYY-MM-DD)
        vehicle_category: Category (economy, compact, premium, luxury, suv, hybrid, any)
    """
    
    city_fleet = VEHICLE_FLEET.get(city)
    if not city_fleet:
        return f"❌ Vehicle rentals not available in {city}. Available cities: {', '.join(VEHICLE_FLEET.keys())}"
    
    # Calculate rental duration
    from datetime import datetime
    pickup = datetime.strptime(pickup_date, "%Y-%m-%d")
    return_dt = datetime.strptime(return_date, "%Y-%m-%d")
    days = (return_dt - pickup).days
    
    if days <= 0:
        return "❌ Invalid dates: Return date must be after pickup date"
    
    # Format comprehensive results
    result = f"🚗 **VEHICLE RENTAL FLEET**\n"
    result += f"📍 Location: {city} | 📅 {pickup_date} to {return_date} ({days} days)\n\n"
    
    for company, categories in city_fleet.items():
        result += f"**🏢 {company}**\n"
        
        for category, details in categories.items():
            if vehicle_category != "any" and vehicle_category.lower() not in category.lower():
                continue
                
            total_cost = details["daily_rate"] * days
            models_list = " or ".join(details["models"])
            
            result += f"   🚙 **{category.title()}**: {models_list}\n"
            result += f"      💰 ${details['daily_rate']}/day × {days} days = **${total_cost} total**\n"
            
            # Add category benefits
            if "luxury" in category:
                result += f"      ✨ Premium features: Leather seats, GPS, Premium sound\n"
            elif "premium" in category:
                result += f"      🎯 Enhanced features: Auto transmission, A/C, Cruise control\n"
            elif "hybrid" in category:
                result += f"      🌱 Eco-friendly: Hybrid engine, Excellent fuel economy\n"
            
            result += "\n"
        
        result += "\n"
    
    return result

# LLM CALLS (Functions with @span)
llm = ChatOpenAI(model="gpt-4", api_key=api_key, temperature=0.1)
tools = [search_flights_inventory, search_hotel_inventory, search_vehicle_fleet]
llm_with_tools = llm.bind_tools(tools)

TRAVEL_AGENT_SYSTEM_PROMPT = """
You are **TravelPro AI**, an elite travel consultant with access to premium booking systems worldwide.

**Your Expertise:**
🛫 **Global Flight Network**: Access to 500+ airlines with real-time pricing and availability
🏨 **Luxury Hotel Portfolio**: Premium accommodations from budget to ultra-luxury  
🚗 **Executive Vehicle Fleet**: Comprehensive car rental network with premium options

**Your Approach:**
- **Consultative**: Ask strategic questions to understand travel preferences and constraints
- **Detail-Oriented**: Provide comprehensive information with pricing, timing, and logistics
- **Proactive**: Anticipate needs and suggest complementary services
- **Professional**: Maintain executive-level communication appropriate for business travelers

**When assisting clients:**
1. **Gather Requirements**: Understand dates, budget, preferences, and travel purpose
2. **Search Systematically**: Use tools to find the best options across all categories
3. **Present Solutions**: Organize results clearly with pros/cons and recommendations
4. **Optimize Experience**: Suggest improvements, alternatives, and travel tips
5. **Facilitate Decisions**: Guide clients toward bookings that match their priorities

Always maintain the highest standards of service excellence and travel industry expertise.
"""

@span("llm_travel_intent_extraction")
def analyze_travel_requirements(state: State) -> Dict[str, Any]:
    """LLM analyzes user message to extract detailed travel requirements and intent"""
    
    last_message = state["messages"][-1].content if state["messages"] else ""
    conversation_context = state.get("conversation_history", [])
    
    analysis_prompt = f"""
    As a travel industry analyst, extract comprehensive travel requirements from this client message:
    
    **Client Message**: "{last_message}"
    
    **Previous Context**: {json.dumps(conversation_context[-3:] if conversation_context else [])}
    
    Extract and classify:
    
    **TRAVEL INTENT**:
    - Primary service: [flight_search, hotel_booking, car_rental, multi_service_planning, travel_consultation]
    - Travel purpose: [business, leisure, mixed, urgent, routine]
    - Complexity level: [simple, moderate, complex, enterprise]
    
    **REQUIREMENTS COMPLETENESS**:
    - Missing critical info: [dates, destination, budget, preferences, passenger_count]
    - Confidence level: [high, medium, low]
    - Next clarification needed: [specific question to ask]
    
    **CLIENT PROFILE INDICATORS**:
    - Traveler segment: [budget, business, luxury, family, solo]  
    - Experience level: [novice, experienced, expert]
    - Decision urgency: [immediate, within_days, flexible]
    
    Respond in JSON format only with these exact keys.
    """
    
    response = llm.invoke([SystemMessage(content=analysis_prompt), HumanMessage(content=last_message)])
    
    try:
        requirements = json.loads(response.content)
        return requirements
    except:
        return {
            "travel_intent": {"primary_service": "travel_consultation", "travel_purpose": "unknown", "complexity_level": "moderate"},
            "requirements_completeness": {"missing_critical_info": ["details_needed"], "confidence_level": "low"},
            "client_profile_indicators": {"traveler_segment": "business", "experience_level": "experienced"}
        }

@span("llm_travel_agent_orchestration")  
def orchestrate_travel_services(state: State):
    """Main LLM orchestration for travel agent with premium tool access"""
    messages = state["messages"]
    if not messages or not isinstance(messages[0], SystemMessage):
        messages = [SystemMessage(content=TRAVEL_AGENT_SYSTEM_PROMPT)] + list(messages)
    
    response = llm_with_tools.invoke(messages)
    return {"messages": [response]}

@span("llm_response_personalization")
def personalize_travel_recommendations(state: State, base_response: str) -> str:
    """LLM enhances responses with personalization based on user profile and history"""
    
    user_profile = state.get("user_profile", {})
    search_context = state.get("search_context", {})
    
    if not user_profile and not search_context:
        return base_response
    
    personalization_prompt = f"""
    As a luxury travel consultant, enhance this response with personalized touches:
    
    **Base Response**: {base_response}
    
    **Client Profile**: {json.dumps(user_profile)}
    **Search Context**: {json.dumps(search_context)}
    
    Enhancement Guidelines:
    - Add relevant personal touches based on profile preferences
    - Reference previous choices or stated preferences  
    - Suggest premium upgrades if appropriate for client segment
    - Include insider tips relevant to their travel style
    - Maintain professional consultant tone
    
    Return the enhanced response maintaining all original information but with personalized additions.
    """
    
    enhanced = llm.invoke([SystemMessage(content=personalization_prompt)])
    return enhanced.content

@span("llm_conversation_summary")
def summarize_travel_session(state: State) -> Dict[str, Any]:
    """LLM creates intelligent summary of travel planning session for context retention"""
    
    messages = state["messages"][-10:]  # Last 10 messages for context
    
    summary_prompt = f"""
    Create a comprehensive travel session summary from this conversation:
    
    **Recent Messages**: {[{"role": msg.__class__.__name__, "content": msg.content[:200]} for msg in messages]}
    
    Extract:
    **TRAVEL PREFERENCES DISCOVERED**:
    - Preferred airlines, hotel chains, car types
    - Budget ranges and class preferences  
    - Travel dates and flexibility
    - Special requirements or accessibility needs
    
    **SERVICES EXPLORED**:
    - Flights searched (routes, dates, preferences)
    - Hotels considered (locations, amenities, pricing)
    - Vehicles discussed (types, rental periods)
    
    **DECISION STATUS**:
    - Ready to book: [list services]
    - Still deciding: [what needs clarification]
    - Future planning: [upcoming needs mentioned]
    
    **CONSULTANT NOTES**:
    - Client communication style
    - Key priorities identified
    - Recommended follow-up actions
    
    Respond in structured JSON format.
    """
    
    summary_response = llm.invoke([SystemMessage(content=summary_prompt)])
    
    try:
        session_summary = json.loads(summary_response.content)
        return session_summary
    except:
        return {"session_status": "active", "services_discussed": ["general_consultation"]}



def determine_workflow_routing(state: State):
    """Smart routing logic for travel workflow"""
    messages = state["messages"]
    last_message = messages[-1]
    
    if hasattr(last_message, 'tool_calls') and last_message.tool_calls:
        return "execute_tools"
    elif isinstance(last_message, HumanMessage):
        return "travel_agent"
    else:
        return "end_session"

def create_travel_workflow():
    """Create sophisticated travel assistant workflow with proper observability"""
    workflow = StateGraph(State)
    
    # Add processing nodes
    workflow.add_node("travel_agent", orchestrate_travel_services)
    workflow.add_node("execute_tools", ToolNode(tools))
    
    # Set entry point
    workflow.set_entry_point("travel_agent")
    
    # Add intelligent routing
    workflow.add_conditional_edges(
        "travel_agent",
        determine_workflow_routing,
        {
            "execute_tools": "execute_tools",
            "travel_agent": "travel_agent",
            "end_session": END,
        }
    )
    
    # Tools always return to agent for response synthesis
    workflow.add_edge("execute_tools", "travel_agent")
    
    return workflow.compile()

# ===================================
# MAIN CONVERSATION ORCHESTRATION
# ===================================
@trace("travel_consultation",
       session={
           "id": f"travel_session_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
           "user_id": "342080c2-e99e-4e09-b171-681496de7c10",
           "project_id": "11369202-0801-471f-8d83-01d7b7709be2",
           "name": "travel-assistant-professional"
       })
def process_travel_consultation(app, state: State, user_input: str):
    """Process complete premium travel consultation with comprehensive observability"""
    
    # Step 1: Analyze travel requirements
    travel_requirements = analyze_travel_requirements(state)
    state["current_search_context"]["current_requirements"] = travel_requirements
    
    # Step 2: Add user message to conversation
    state["messages"].append(HumanMessage(content=user_input))
    
    # Step 3: Execute travel workflow
    result = app.invoke(state)
    last_message = result["messages"][-1]
    
    if isinstance(last_message, AIMessage):
        base_response = last_message.content
        
        # Step 4: Personalize response if profile exists
        if result.get("user_profile"):
            final_response = personalize_travel_recommendations(result, base_response)
        else:
            final_response = base_response
        
        # Step 5: Update conversation history
        conversation_entry = {
            "timestamp": datetime.now().isoformat(),
            "user_input": user_input,
            "agent_response": final_response[:500] + "..." if len(final_response) > 500 else final_response,
            "services_used": [tool_call.get("name", "unknown") for msg in result["messages"] 
                                if hasattr(msg, 'tool_calls') and msg.tool_calls 
                                for tool_call in msg.tool_calls],
            "requirements_analysis": travel_requirements
        }
        
        result.setdefault("conversation_history", []).append(conversation_entry)
        
        # Step 6: Generate session summary periodically
        if len(result["conversation_history"]) % 5 == 0:  # Every 5 interactions
            session_summary = summarize_travel_session(result)
            result.setdefault("session_metadata", {})["latest_summary"] = session_summary
        
        return final_response, result
    else:
        return "I apologize for the technical difficulty. Could you please rephrase your travel request?", result


def main():
    """Enhanced travel assistant main loop"""
    print("✈️ Welcome to TravelGenie - Your AI Travel Assistant!")
    print("🌍 I can help you find flights, hotels, and car rentals worldwide.")
    print("💡 Try: 'Find flights from NYC to Paris next Friday' or 'Hotels in Tokyo for 3 nights'")
    print("Type 'quit' to exit.\n")
    
    app = create_travel_workflow()
    
    state = State(
        messages=[SystemMessage(content=TRAVEL_AGENT_SYSTEM_PROMPT)],
        user_profile={
            "traveler_tier": "executive",
            "preferred_cabin": "business", 
            "hotel_category": "luxury",
            "vehicle_preference": "premium",
            "loyalty_programs": [],
            "travel_frequency": "frequent"
        },
        current_search_context={},
        booking_session={"session_id": f"session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"}
    )

    while True:
        try:
            user_input = input("🧳 You: ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\n✈️ Happy travels! Bon voyage! 🌟")
            break

        if user_input.lower() in ("quit", "exit", "bye", "goodbye"):
            print("✈️ Happy travels! Bon voyage! 🌟")
            break

        if not user_input:
            continue

        try:
            reply, state = process_travel_consultation(app, state, user_input)
            print(f"\n🤖 TravelGenie: {reply}\n")
            print("-" * 80)
            
        except Exception as e:
            print(f"❌ Sorry, I encountered an error: {e}")
            print("Please try rephrasing your travel request.\n")

if __name__ == "__main__":
    main()