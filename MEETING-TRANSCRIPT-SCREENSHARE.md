# Meeting Transcript — EVM × Axiom Labs (Screenshare with Prashant)

**Date:** 22 September 2026
**Participants:** Prashant Jain (EVM), Rishav Kumar (Axiom Labs)

---

Prashant Jain: Hello, Prashant.
rishav kumar (You):  What's up, Arty?
Prashant Jain:  Hello.
rishav kumar (You):  Hello?
Prashant Jain:  Hi, yeah, Prashant. How are you doing?
rishav kumar (You):  Hi.
Prashant Jain:  Hi, Rishav. Uh, I'll just share my screen.
rishav kumar (You):  Yeah, sure.
Prashant Jain:  Alright.
rishav kumar (You):  Okay.
Prashant Jain:  So this is our, uh, order procurement tool where we track and manage our entire order, along with our MSL. So this is our MSL planning screen.
rishav kumar (You):  Alright.
Prashant Jain:  Okay, so this is the SKU. This is the current stock. This is the monthly selling plan.
Prashant Jain:  Let's say, uh, I have to sell 75,000 SKU, or I might need an inward of 75,000 pieces of this SKU in the entire month.
rishav kumar (You):  Okay.
Prashant Jain:  So I've set this MSP here. And then this is procurement time. Let's say to procure this item, I need 30 days of time.
Prashant Jain:  If I order it now, I'll get it around 23 October.
rishav kumar (You):  Okay.
Prashant Jain:  So the procurement time is 30 days.
rishav kumar (You):  Mm-hmm.
Prashant Jain:  In several cases, uh, the procurement time is different. For example, I'll show you here.
Prashant Jain:  Uh, so here the procurement time is 60.
rishav kumar (You):  Okay.
Prashant Jain:  So the minimum stock level has been adjusted to 400.
rishav kumar (You):  Alright, okay.
Prashant Jain:  Okay, so MOQ for each item is defined here. So the ordering would go as per the MOQ.
rishav kumar (You):  Mm-hmm.
Prashant Jain:  Several items have different MOQs. So if my MSL is 400, but the MOQ is 1,000, so, uh, once I order 1,000, I don't have to order for at least, uh, 6 months.
rishav kumar (You):  Okay, got it. Uh, apart from that, like, you were also mentioning that, like, there is one MSL for your main team, main product MSL stored here, and one is for your e-commerce team, separate, like for Amazon and, like, or the Flipkart. So you guys were mentioning two dynamic MSLs.
rishav kumar (You):  You mentioned the.
Prashant Jain:  Yes, that's what we want your solution for.
rishav kumar (You):  Okay.
Prashant Jain:  So I'll just explain the remaining part. Uh, that is also relevant for this MSL planning.
rishav kumar (You):  Exactly.
Prashant Jain:  Uh, this is.
rishav kumar (You):  PO will just show me up. Yeah.
Prashant Jain:  These are the open POs, the orders which I have placed to the vendor.
rishav kumar (You):  Okay.
Prashant Jain:  And which are in the pipeline.
rishav kumar (You):  Okay, that means these are in transit, right?
Prashant Jain:  These are open POs and in transit. Yes, you can consider that as in transit.
rishav kumar (You):  Sure.
Prashant Jain:  Quantity.
rishav kumar (You):  Okay.
Prashant Jain:  After this, we, uh, get a reorder quantity.
rishav kumar (You):  Mm-hmm.
Prashant Jain:  This is the formula. I think you should note this formula down.
rishav kumar (You):  Uh, alright, let me just take, uh, note a screenshot of it. Okay, got it.
Prashant Jain:  Got it. Okay, so this is where we track our entire procurement.
rishav kumar (You):  Got it.
Prashant Jain:  End to end.
rishav kumar (You):  Mm-hmm.
Prashant Jain:  Okay, this is what I guess, uh, uh, you wanted to look at this screen, right?
rishav kumar (You):  Yeah.
Prashant Jain:  Shyam also wanted to look at this screen where we plan, uh, plan and manage our, uh, stock for procurement.
rishav kumar (You):  Exactly. There are several things that we wanted to look on, but it's fine. You just show me.
Prashant Jain:  Okay, let me know what else do you want. We place our orders from here.
rishav kumar (You):  Okay.
Prashant Jain:  To each vendor's.
rishav kumar (You):  Uh-huh.
Prashant Jain:  This is the history, uh, vendor-wise, and SKU-wise, open purchase orders. When we say open purchase orders.
rishav kumar (You):  Uh, can you just hold your screen up here because I wanted to see how you guys are, like, managing this.
Prashant Jain:  Okay.
rishav kumar (You):  Okay.
Prashant Jain:  And this is where we get the updates of our new shipment. Our logistics team handles, uh, the entire shipment part, where they, uh, monitor and update, uh, each and every shipment.
rishav kumar (You):  Mm-hmm.
Prashant Jain:  From pickup from the factory to delivery to our warehouse.
rishav kumar (You):  Okay, okay.
Prashant Jain:  So when a shipment, uh, when a purchase order goes into shipment, it directly reflects in the in transit mode of MSL planning.
rishav kumar (You):  Uh, okay.
Prashant Jain:  Previously, it's in open PO, and then it moves to in transit.
rishav kumar (You):  Ah, understood. Makes sense. Uh, okay, so, like, can you, like, show me those, like, some list of all six locations you were mentioning that which one.
Prashant Jain:  Okay.
rishav kumar (You):  Which ones are EVM-owned warehouses and which are, like.
Prashant Jain:  All are, all are EVM-owned warehouses. Uh.
Prashant Jain:  So, uh, by warehouses. So we have Vasai, we have Bivandi, we have Delhi, we have Chennai, we have factory, we have e-commerce, and we have a depot.
Prashant Jain:  So each SKU is defined into multiple warehouses.
rishav kumar (You):  Okay.
Prashant Jain:  Let's say this SKU is available in multiple warehouses.
rishav kumar (You):  Uh, yeah, it's visible.
Prashant Jain:  128 GB. So, uh, this is the same SKU available in three different warehouses.
rishav kumar (You):  Yeah. Okay. Uh-huh.
rishav kumar (You):  Yeah, seems fine.
Prashant Jain:  So the availability differs from warehouse to warehouse and, uh, stock to stock.
rishav kumar (You):  Okay, so, like.
Prashant Jain:  So it can be three, it can be six.
rishav kumar (You):  Mm-hmm.
Prashant Jain:  Yes.
rishav kumar (You):  Ah, correct. Okay. Like, uh, apart from that, I wanted to see those, like, uh, like, the SQL and product screen which you just showed me in detail.
rishav kumar (You):  That is fine. Like, uh, okay, like, can you just show me, uh, a current stock for one SQ across all the locations?
rishav kumar (You):  If it's possible.
Prashant Jain:  Uh, across all the locations.
rishav kumar (You):  I mean, any, any one.
Prashant Jain:  SKU which will be available in, uh, many warehouses. It can be E0 and 09. This SKU might be available in almost all the warehouses.
Prashant Jain:  So it's in Vasai, Bivandi, Delhi, I guess Depot, and these are, uh, there are a few warehouses where the stock is, uh, not available.
rishav kumar (You):  Yeah, I got it. I got it. Okay.
rishav kumar (You):  Uh, correct, correct. Uh, like, one important thing I was, uh, like, wanting to ask you that.
rishav kumar (You):  You mentioned about product team has one MSL you just showed me up here. And apart from that, like, e-commerce team has their own, uh, monthly MSL you were mentioning that changes frequently dynamically, right?
Prashant Jain:  Correct.
rishav kumar (You):  So.
Prashant Jain:  Correct.
rishav kumar (You):  I wanted to just see that. Does the e-commerce MSL change per channel, like Amazon MSL, or it is, it is one e-commerce MSL or?
Prashant Jain:  Currently, it is one e-commerce MSL. We have multiple channels in e-commerce, but, uh, the e-commerce team plans is as a single, uh, quantity.
rishav kumar (You):  Ah, okay.
Prashant Jain:  Not bifurcated.
rishav kumar (You):  One basic master house out there. Okay. Uh, makes sense.
rishav kumar (You):  Things are getting clearer now. Oh, like.
rishav kumar (You):  And if it's possible, can I see any one particular purchase order? I just want purchase order fields, all those vendors and SKUs, how these are actually managing, which are managed quantities are actually pending and you guys are receiving stuff.
rishav kumar (You):  Like, the status.
Prashant Jain:  So.
rishav kumar (You):  Yeah.
Prashant Jain:  This is the purchase order. This is the transaction.
rishav kumar (You):  Uh-huh. Okay.
Prashant Jain:  Uh, bill to Hyundai Info Solutions.
rishav kumar (You):  Mm-hmm.
Prashant Jain:  Consignee ship-to is also. Supplier name is here. PO type is SFG.
rishav kumar (You):  Okay.
Prashant Jain:  Like, it could be finished goods or it could be semi-finished goods. Currency. Shipment terms.
Prashant Jain:  Shipment terms is, like, uh, how the supplier or how the procurement teams want the shipment. It could be ex-works, it could be FOB, it could be multiple, uh, factors.
Prashant Jain:  Okay, like, can you just, like, give me a brief about what you just mean by shipment terms? Okay, shipment terms is, like, uh, let's say, uh, I'll give you two scenarios.
Prashant Jain:  One is, uh, where I pay the freight for inwarding.
rishav kumar (You):  Mm-hmm.
Prashant Jain:  Second is the supplier pays the freight for inwarding.
rishav kumar (You):  Okay.
Prashant Jain:  So in that, there are multiple, uh, shipment terms. One is, like, 15% freight would be beared by a supplier, 50% would be us. Supplier would only bear the cost, uh, supplier will only pay the cost, uh, till sending the material to the port.
rishav kumar (You):  Correct.
Prashant Jain:  Or the entire cost is beared by us.
rishav kumar (You):  Mm-hmm.
Prashant Jain:  Such cases, you might need to, you know, uh, uh, read on all these shipment terms.
rishav kumar (You):  Yeah.
Prashant Jain:  So majorly it's FOB or ex-works.
rishav kumar (You):  Okay.
Prashant Jain:  Okay. And then, uh, we add each SKU which we want to order.
rishav kumar (You):  Alright, alright, alright, alright.
Prashant Jain:  Quantity, price, rate, and amount. That's it.
rishav kumar (You):  Okay. Uh-huh. It's clear from my side.
rishav kumar (You):  Like, okay.
Prashant Jain:  Okay, and in that form, you were also mentioning that there are internal transfer happening between your warehouses and between the locations.
rishav kumar (You):  Yeah, that's, that's warehouse to warehouse transfer. So that is not in the procurement. It is in the WMS system.
rishav kumar (You):  Warehouse, warehouse management system. It's not here.
Prashant Jain:  Ah, ah, okay.
rishav kumar (You):  The warehouse raises a request for certain stock, and the other warehouse furnishes the, uh, those requests.
Prashant Jain:  Okay, so, like, warehouse, warehouse, one warehouse, like, just, uh, warehouse, and they order.
Prashant Jain:  Correct. Let's say the stock I showed you there, P0109, is not available in the depot warehouse.
Prashant Jain:  So depot warehouse would request Bivandi warehouse to send, uh, them stock for P0109. Alright.
Prashant Jain:  Okay. And, like, all the six warehouses going in here, like, are these, like, very closely, like, within, uh, within Bombay or within that step, or?
rishav kumar (You):  So, so I'll explain you. Uh, three, four warehouses are in Bombay.
Prashant Jain:  Okay. One is Delhi, one is Chennai. But in Bombay, each warehouse is, like, 30 to 40 kilometers or maybe 50 kilometers apart.
Prashant Jain:  Uh-huh, uh-huh. Okay, that would be an important signal, I guess, for the feature specific we are thinking about. Okay, correct. Thanks for clarifying this.
rishav kumar (You):  Uh, uh, uh, okay, you were also showing, like, can you just show me one export file that about any SKU you were just. What SKU?
rishav kumar (You):  I mean, not the specific SKU, like, all those. Uh, basically, I just want to get some, uh, ask some integration questions, like, for to pull data from your app automatically.
rishav kumar (You):  Is there something, or whether you could just suggest me, uh, easiest path, or you could just show me here any Excel sheet that is get, like, automated or stuff related to that.
rishav kumar (You):  Uh, we get our data from multiple sources. One is a warehouse management system, one is
Prashant Jain:  our ERP, and several systems. So what exactly, what type of data do you want? You just want an API for reports or what?
Prashant Jain:  Like, if it's possible, you can, uh, share me a schema of your report also, if it's there. But what is more preferable from my side is that, is it, like, by any chance possible that, like, does this app have any API endpoints so that we can.
Prashant Jain:  Yes, yes, this app has API endpoints.
Prashant Jain:  And, uh, schema, I would, I would need to request my developer to share with you the schema for SKU, but you would only require schema for SKU? I mean, item, or I guess you would need multiple reports to, uh, you know, get to a point where you can define or, uh, differentiate the MSL, e-commerce MSL with, uh, channel MSL.
Prashant Jain:  Exactly. So yeah, you got my point, but I'm trying to mention that.
Prashant Jain:  If it's possible, then please let us provide those by asking your developer team. And, uh, but before that, I would like to hear a solution, like, how are you planning to, you know, solve the problem before implementing any, uh, software changes.
Prashant Jain:  Okay, yeah, yeah, that's, that's exactly, like, we were also thinking of. Uh, we, like, uh, considering all this information you just gave us and what we have, uh, brainstormed and researched, we can provide you a working prototype by the end of, like, by in within two or three days. Uh, but yeah, okay, let's see that how it goes. And, and after those things, like, uh, I just want you to, like, would your dev team be open to exposing a few read-only endpoints and stuff?
rishav kumar (You):  Like, those are. Uh, I might need to check with my dev team if there are any security concerns related to, uh, the view-only access.
rishav kumar (You):  I'll let you know. If not, we'll definitely share.
Prashant Jain:  Exactly. Like, if there are no any constraint, then just, you just, like, if you are free and it is not any, like, uh, constraint related to that, any safety issue related to that, you can just share it over to Shyam also and to me also. And, uh, but okay, it is just an optional thing, I would say, because considering all this given information out here, uh, we can give you solutions and, and those documents and stuff.
rishav kumar (You):  So, like, Prashant, is there anything that you want us to show that it could be helpful and we just need to understand about your, uh, like, internal tool or stuff?
Prashant Jain:  I'll just tell you one thing.
rishav kumar (You):  I guess the voice is echoing. Uh, is it, like, like, am I audible to you clearly or not? I don't know.
rishav kumar (You):  Yeah, you are audible. My voice is, uh, echoing.
rishav kumar (You):  I guess it's repeating. Just a minute.
rishav kumar (You):  Hello?
Prashant Jain:  Yeah, yeah.
rishav kumar (You):  Am I audible?
Prashant Jain:  Okay, so I'll just, uh, give you a heads-up with e-commerce MSL. E-commerce, uh, we have two different MSLs. One is channel, general trade, where we supply goods offline to the distributors, retailers, and the offline network.
Prashant Jain:  So that MSL is, like, quarterly frequent. It does not change so frequently.
Prashant Jain:  Like, once it is set to 100, it would stay 100 for at least three months, unless and until there is some volatile changes which are not expected in the sales trend. But for e-commerce MSL, it's, uh, very volatile.
Prashant Jain:  So let's say, uh, if I go for this quarter, uh, there are multiple sales coming up. So there would be a certain spike in certain SKUs, which is expected.
Prashant Jain:  If my daily DRR, we say daily run rate, is 100, uh, in normal period, so in the sales period, it would go, like, 120, 150, and 200. But that is also, again, expected.
rishav kumar (You):  Correct.
Prashant Jain:  If my one month's DRR does not match the expected 200 range, I might need to reduce it to a certain point where I can, uh, you know, manage my stock. I don't want to overstock. I don't want to overspend on inventory.
Prashant Jain:  I don't want to hold, uh, my, uh, capital in, uh, holding the inventory.
rishav kumar (You):  Makes sense.
Prashant Jain:  So, so that is where we want a solution from you guys.
rishav kumar (You):  Oh, right. So, like, this is a part.
Prashant Jain:  So channel G, channel MSL is, uh, stable, stagnant. But e-commerce MSL is very volatile.
rishav kumar (You):  Alright.
Prashant Jain:  It needs to be reviewed every month. Yeah, that works fine for us. Like, we have drafted some sort of solution.
Prashant Jain:  That's why we jumped over into the meet. Like, we were aware of the point that there is a part which is very volatile and very, like, dynamic. So we are thinking on this question.
rishav kumar (You):  Uh, okay, so this is the, uh, actually the confirmation that this is the main concern and this is the main point where main pain point for you guys that you guys are targeting solution for.
Prashant Jain:  Correct.
rishav kumar (You):  For this e-commerce thing, e-commerce MSL. Okay. Okay, Prashant, like, I think that is enough information I wanted to know from your internal tool and from, like, thanks a lot for getting, like, taking the time with us.
Prashant Jain:  Welcome to you.
Prashant Jain:  Anything else if you would like?
rishav kumar (You):  Like, I, I think I have asked enough everything about. Let me just see those, uh, questions I just, I have jotted down previously. Uh, give me a second.
rishav kumar (You):  Like.
Prashant Jain:  Sure, sure.
rishav kumar (You):  Uh, okay, so, like, can you just let me know that where is the product MSL stored, like, or where is the e-commerce MSL stored? Like, it is on the separate screen or separate sheet or on a product page itself?
Prashant Jain:  No, no, no. We have not segregated that yet.
rishav kumar (You):  Ah, okay. So would you be ready to segregate it?
Prashant Jain:  If we manage those things into a separate chunk or stuff.
rishav kumar (You):  Yeah, we are planning to, uh, segregate that in a separate tab for e-commerce as well. So this is our CRM where we manage our GT, general trade. We have one more upcoming for our e-commerce. That is where we'll manage our MSL for e-commerce as well, which would reflect here in, uh, the MSL planning for product ads.
Prashant Jain:  Okay, okay, okay. Understood.
Prashant Jain:  Uh, okay, so, like, you were also mentioning in the, that our form that there are partial order being supplied from your vendors and manufacturers. So how guys, how you guys are actually managing that thing and keeping record of that if it's possible?
Prashant Jain:  So, uh, we knock off purchase orders with purchase. So let's say I have placed an order for 100, uh, power bank.
Prashant Jain:  So we placed an order of purchase order for 100 power bank, and, uh, we received, let's say, 60 power bank. So when we take inward, when we do GRN, we knock off that 60 power bank against that purchase order.
Prashant Jain:  So when I showed you the screen, this is where, uh, all my purchase order track is kept. So here you can see the ordered quantity and balance quantity.
rishav kumar (You):  Okay. Ah, hmm, yeah, got it, got it, got it.
Prashant Jain:  So majorly, uh, it's like 20/80. 80% order gets cleared in one, uh, yeah, short. But, but, uh, 20% are there where partial delivery or partial shipment happens.
rishav kumar (You):  Alright, alright.
Prashant Jain:  Uh, I think that is all from my side. Like, one thing I, like, just left behind is that you were mentioning some formulas.
Prashant Jain:  So, like, is, are there any other formulas for calculating those ROI like?
Prashant Jain:  No, this is the only formula we follow, and this is a standard formula across industries.
rishav kumar (You):  Exactly, so that we can look about, but if it any personalized to you that I just wanted to see. But anyways, it's fine.
Prashant Jain:  Sure.
rishav kumar (You):  Okay, Prashant, that is very, I'm very thankful that you gave us a time and split off here.
rishav kumar (You):  Yeah. Okay.
Prashant Jain:  Thank you, Rishav.
rishav kumar (You):  Nice talking to you, Prashant. Have a good day. Bye-bye.
Prashant Jain:  Good day. Good day, Rishav.
